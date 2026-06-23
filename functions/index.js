/**
 * EleGuard — FCM via Firebase Admin SDK
 *
 * Deployed on Firebase, credentials are automatic (no serviceAccountKey.json in repo).
 * Local emulator: set GOOGLE_APPLICATION_CREDENTIALS to a service account JSON path.
 */

const functions = require('firebase-functions')
const admin = require('firebase-admin')

const RTDB_URL = 'https://studio-9916723566-5e1ef-default-rtdb.firebaseio.com'

if (!admin.apps.length) {
  admin.initializeApp({
    databaseURL: RTDB_URL,
  })
}

const messaging = admin.messaging()
const db = admin.database()

const ALARM_CHANNEL_ID = 'alarm-notifications'

function shouldAlert(sensor) {
  if (!sensor || typeof sensor !== 'object') return false
  if (!sensor.isActive) return false
  if (sensor.falseAlarm) return false
  const sev = (sensor.severity || '').toString().toUpperCase()
  if (sev === 'SAFE' || sev === '') return false
  return true
}

function isNewOrChangedReading(before, after) {
  if (!before) return true
  if (after.timestamp !== before.timestamp) return true
  if (before.isActive !== after.isActive) return true
  if ((before.severity || '') !== (after.severity || '')) return true
  return false
}

/**
 * Collect FCM registration tokens from users/{uid}/fcmToken (written by the app on Android).
 */
async function getAllFcmTokens() {
  const snap = await db.ref('users').once('value')
  const tokens = []
  snap.forEach((child) => {
    const v = child.val()
    if (v && typeof v.fcmToken === 'string' && v.fcmToken.length > 80) {
      tokens.push({ uid: child.key, token: v.fcmToken })
    }
  })
  return tokens
}

async function sendFcmToTokens(tokens, payload) {
  if (!tokens.length) return { sent: 0, skipped: 0 }

  const messages = tokens.map(({ token }) => ({
    token,
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: {
      sensorId: String(payload.sensorId || ''),
      zone: String(payload.zone || ''),
      severity: String(payload.severity || ''),
    },
    android: {
      priority: 'high',
      notification: {
        channelId: ALARM_CHANNEL_ID,
        sound: 'default',
        priority: 'max',
      },
    },
  }))

  const res = await messaging.sendEach(messages)
  return { sent: res.successCount, failed: res.failureCount, responses: res.responses }
}

exports.onSensorSignalFcm = functions.database
  .ref('/iot_signals/{sensorId}')
  .onWrite(async (change, context) => {
    const sensorId = context.params.sensorId
    const after = change.after.val()
    const before = change.before.val()

    // 1. MASTER LOCK: Check global autoDefense status FIRST (MUST BE AT THE TOP)
    const autoDefenseSnap = await db.ref('defense_system/autoDefense').once('value')
    const isAutoDefenseEnabled = autoDefenseSnap.val() === true
    
    if (!isAutoDefenseEnabled) {
      // FIX 2: Reset this sensor's counters so they don't accumulate while disabled
      await db.ref(`defending_system/alert_counters/${sensorId}`).update({
        highSeverityCount: 0,
        lowSeverityCount: 0,
        autoTriggered: false
      })
      return null
    }

    if (!shouldAlert(after)) {
      return null
    }
    if (!isNewOrChangedReading(before, after)) {
      return null
    }

    const zone = after.zone || `Zone-${sensorId}`
    const severity = (after.severity || '').toString().toUpperCase()
    const timestamp = new Date().toISOString()
    
    // --- SERVER-SIDE DEFENSE LOGIC ---
    const isSafe = severity === 'SAFE'
    const isTrigger = after.isActive && !after.falseAlarm && !isSafe
    
    const counterRef = db.ref(`defending_system/alert_counters/${sensorId}`)
    const updates = {}

    if (isSafe) {
      // RESET LOGIC ON SAFE
      updates[`defending_system/alert_counters/${sensorId}/highSeverityCount`] = 0
      updates[`defending_system/alert_counters/${sensorId}/lowSeverityCount`] = 0
      updates[`defending_system/alert_counters/${sensorId}/autoTriggered`] = false
      
      // Deactivate hardware
      updates[`defending_system/sensors/${sensorId}/buzzer/isActive`] = false
      updates[`defending_system/sensors/${sensorId}/impulseWave/isActive`] = false
      updates[`defense_system/sensor_controls/${sensorId}/buzzer`] = false
      updates[`defense_system/sensor_controls/${sensorId}/impulse`] = false
      
      // Write DEACTIVATED log
      const logRef = db.ref('defending_system/logs').push()
      updates[`defending_system/logs/${logRef.key}`] = {
        action: "DEACTIVATED",
        deviceType: "BUZZER+IMPULSE_WAVE",
        intensity: "NONE",
        reason: "SAFE signal received",
        sensorId: sensorId,
        severity: severity,
        timestamp: timestamp,
        triggerType: "AUTO",
        triggeredBy: "auto"
      }

      // Check if any other sensors are still active to update global status
      const allCountersSnap = await db.ref('defending_system/alert_counters').once('value')
      let anyOtherActive = false
      allCountersSnap.forEach((child) => {
        if (child.key !== sensorId && child.val().autoTriggered === true) {
          anyOtherActive = true
        }
      })
      if (!anyOtherActive) {
        updates[`defense_system/status`] = "STANDBY"
      }
    } else if (isTrigger) {
      const counterSnap = await counterRef.once('value')
      const counters = counterSnap.val() || { highSeverityCount: 0, lowSeverityCount: 0, autoTriggered: false }
      
      // FIX 3: lastProcessedKey guard to prevent reprocessing old/duplicate signals
      const lastKey = counters.lastProcessedKey || ''
      const currentKey = after.timestamp || ''
      if (lastKey === currentKey && lastKey !== '') {
        functions.logger.info('Duplicate signal detected. Skipping.', { sensorId, currentKey })
        return null
      }
      updates[`defending_system/alert_counters/${sensorId}/lastProcessedKey`] = currentKey

      if (!counters.autoTriggered) {
        const isHigh = severity === 'HIGH' || severity === 'CRITICAL'
        const isLow = severity === 'LOW' || severity === 'MEDIUM'

        let newHigh = counters.highSeverityCount || 0
        let newLow = counters.lowSeverityCount || 0

        if (isHigh) {
          newHigh += 1
          newLow = 0 // CONSECUTIVE RULE: Reset low if high received
        } else if (isLow) {
          newLow += 1
          newHigh = 0 // CONSECUTIVE RULE: Reset high if low received
        }

        const highThreshold = 5
        const lowThreshold = 10
        const shouldTrigger = newHigh >= highThreshold || newLow >= lowThreshold

        updates[`defending_system/alert_counters/${sensorId}/highSeverityCount`] = newHigh
        updates[`defending_system/alert_counters/${sensorId}/lowSeverityCount`] = newLow

        if (shouldTrigger) {
          updates[`defending_system/alert_counters/${sensorId}/autoTriggered`] = true
          
          const deterrentState = {
            isActive: true,
            activatedAt: timestamp,
            triggerType: 'AUTO_STREAK',
            triggeredBy: 'system',
            intensity: isHigh ? 'HIGH' : 'MED',
            durationSeconds: 60
          }
          
          updates[`defending_system/sensors/${sensorId}/buzzer`] = deterrentState
          updates[`defending_system/sensors/${sensorId}/impulseWave`] = deterrentState
          updates[`defense_system/sensor_controls/${sensorId}/buzzer`] = true
          updates[`defense_system/sensor_controls/${sensorId}/impulse`] = true
          updates[`defense_system/status`] = "ACTIVE"

          // Write ACTIVATED log
          const logRef = db.ref('defending_system/logs').push()
          updates[`defending_system/logs/${logRef.key}`] = {
            action: "ACTIVATED",
            deviceType: "BUZZER+IMPULSE_WAVE",
            intensity: isHigh ? "HIGH" : "MED",
            reason: `Threshold reached: ${isHigh ? newHigh : newLow} consecutive alerts`,
            sensorId: sensorId,
            severity: severity,
            timestamp: timestamp,
            triggerType: "AUTO",
            triggeredBy: "auto"
          }
        }
      }
    }

    if (Object.keys(updates).length > 0) {
      await db.ref().update(updates)
    }

    // --- NOTIFICATION LOGIC ---
    const entries = await getAllFcmTokens()
    if (entries.length > 0) {
      const title = `EleGuard — ${zone}`
      const body = `${severity} · Sensor ${sensorId} · Amplitude ${after.amplitude ?? '—'}`
      
      try {
        await sendFcmToTokens(entries, {
          title,
          body,
          sensorId,
          zone,
          severity: severity,
        })
      } catch (e) {
        functions.logger.error('FCM send failed', e)
      }
    }

    return null
  })

/**
 * GLOBAL AUTO-RESET: Triggered when the master switch is toggled.
 * If disabled, we aggressively reset ALL state across the database.
 */
exports.onAutoDefenseToggle = functions.database
  .ref('/defense_system/autoDefense')
  .onWrite(async (change, context) => {
    const isEnabled = change.after.val()
    
    // If turning OFF (false) or if the node was deleted (null)
    if (isEnabled === false || isEnabled === null) {
      functions.logger.info('Auto Defense DISABLED. Performing global reset...')
      
      // FIX 1: Read sensor IDs from alert_counters and use hardcoded fallback
      const countersSnap = await db.ref('defending_system/alert_counters').once('value')
      const counters = countersSnap.val() || {}
      const existingSensorIds = Object.keys(counters)
      
      const knownSensors = ['S1','S2','S3','S4','S5','S6','S7','S8','S9','S10','S11','S12','S13','S14']
      const allSensorIds = [...new Set([...existingSensorIds, ...knownSensors])]
      
      const resets = {}
      
      // 1. Reset Global Status
      resets['defense_system/status'] = 'STANDBY'
      
      // 2. Reset every sensor counter and control
      allSensorIds.forEach(id => {
        // Reset Counters
        resets[`defending_system/alert_counters/${id}/highSeverityCount`] = 0
        resets[`defending_system/alert_counters/${id}/lowSeverityCount`] = 0
        resets[`defending_system/alert_counters/${id}/autoTriggered`] = false
        resets[`defending_system/alert_counters/${id}/lastProcessedKey`] = ''
        
        // Reset Controls
        resets[`defense_system/sensor_controls/${id}/buzzer`] = false
        resets[`defense_system/sensor_controls/${id}/impulse`] = false
        
        // Reset Hardware State (optional check if node exists)
        resets[`defending_system/sensors/${id}/buzzer/isActive`] = false
        resets[`defending_system/sensors/${id}/impulseWave/isActive`] = false
      })
      
      await db.ref().update(resets)
    }
    
    return null
  })
