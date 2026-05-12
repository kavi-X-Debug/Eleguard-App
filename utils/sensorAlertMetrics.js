/**
 * Display helpers for sensor alerts: amplitude/strength from RTDB `amplitude` (v/s);
 * proximity/confidence from threat tier (`severity`) — see constants/sensors THREAT_RADIUS_METERS_BY_SEVERITY.
 */

import { THREAT_RADIUS_METERS_BY_SEVERITY } from '../constants/sensors';

const SEVERITY_ALIASES = {
  WARN: 'MEDIUM',
  WARNING: 'MEDIUM',
  MODERATE: 'MEDIUM',
  SEVERE: 'HIGH',
  EMERGENCY: 'CRITICAL',
};

/** @see AlertHistoryScreen — trim + uppercase + common aliases */
export function normalizeSeverity(raw) {
  if (raw == null || raw === '') return null;
  const s = String(raw).trim().toUpperCase();
  return SEVERITY_ALIASES[s] ?? s;
}

const CONFIDENCE_BY_SEVERITY = {
  LOW: '58%',
  MEDIUM: '74%',
  HIGH: '92%',
  CRITICAL: '98%',
};

/**
 * @param {unknown} alertLike
 * @returns {number | null} numeric amplitude, or null if missing / invalid
 */
export function getAlertAmplitude(alertLike) {
  if (alertLike == null) return null;
  const raw = alertLike?.amplitude;
  if (raw === undefined || raw === null || raw === '') return null;
  const n = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** @param {number | null} amp */
export function formatAmplitudeVs(amp) {
  if (amp == null || !Number.isFinite(amp)) return '— v/s';
  const rounded = Math.round(amp * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${text} v/s`;
}

/** @param {number | null} amp */
export function formatStrengthPercent(amp) {
  const n = amp == null || !Number.isFinite(amp) ? 0 : amp;
  return `${Math.min(100, Math.round(n * 10))}%`;
}

/**
 * Proximity label: meters from THREAT_RADIUS_METERS_BY_SEVERITY[normalized severity]
 * (threat field is `severity`, same as heatmap / SensorDot).
 */
export function formatProximityFromSeverity(normalizedSeverity) {
  if (normalizedSeverity == null) return '—';
  const m = THREAT_RADIUS_METERS_BY_SEVERITY[normalizedSeverity];
  if (m == null || !Number.isFinite(m)) return '—';
  return `~${Math.round(m)}m`;
}

/** Confidence fixed per severity tier (not amplitude). */
export function formatConfidenceFromSeverity(normalizedSeverity) {
  if (normalizedSeverity == null) return '—';
  return CONFIDENCE_BY_SEVERITY[normalizedSeverity] ?? '—';
}

/**
 * @param {unknown} alertLike
 */
export function getSensorAlertDisplayMetrics(alertLike) {
  const amplitude = getAlertAmplitude(alertLike);
  const severity = normalizeSeverity(alertLike?.severity);
  return {
    amplitude,
    amplitudeLine: formatAmplitudeVs(amplitude),
    strengthLine: formatStrengthPercent(amplitude),
    proximityLine: formatProximityFromSeverity(severity),
    confidenceLine: formatConfidenceFromSeverity(severity),
  };
}
