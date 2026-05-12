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

    if (!shouldAlert(after)) {
      return null
    }
    if (!isNewOrChangedReading(before, after)) {
      return null
    }

    const zone = after.zone || `Zone-${sensorId}`
    const title = `EleGuard — ${zone}`
    const body = `${after.severity} · Sensor ${sensorId} · Amplitude ${after.amplitude ?? '—'}`

    const entries = await getAllFcmTokens()
    if (!entries.length) {
      functions.logger.info('No FCM tokens registered under users/*/fcmToken')
      return null
    }

    try {
      const result = await sendFcmToTokens(entries, {
        title,
        body,
        sensorId,
        zone,
        severity: after.severity,
      })
      functions.logger.info('FCM batch', { sensorId, ...result })
    } catch (e) {
      functions.logger.error('FCM send failed', e)
    }

    return null
  })
