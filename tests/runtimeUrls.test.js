import assert from 'node:assert/strict'
import test from 'node:test'
import heightAdjustmentConfig from '../frontend/src/config/heightAdjustmentConfig.js'
import {
  getPublicAppUrl,
  getPublicPhoneBaseUrl,
  getMotorServiceUrl,
  getSocketUrl,
  normalizePublicPhoneOrigin,
  normalizeRuntimeOrigin,
} from '../frontend/src/realtime/runtimeUrls.js'

const localLocation = Object.freeze({
  hostname: '192.168.1.40',
  origin: 'http://192.168.1.40:5173',
  protocol: 'http:',
})

test('VITE_SOCKET_URL overrides the local Socket.IO URL', () => {
  assert.equal(
    getSocketUrl({
      env: { VITE_SOCKET_URL: 'https://api.artimir.fr/' },
      location: localLocation,
    }),
    'https://api.artimir.fr',
  )
})

test('Socket.IO URL falls back to the current host and port 3001', () => {
  assert.equal(
    getSocketUrl({
      env: {},
      location: localLocation,
    }),
    'http://192.168.1.40:3001',
  )
})

test('public app URL uses VITE_PUBLIC_APP_URL when provided', () => {
  assert.equal(
    getPublicAppUrl({
      env: { VITE_PUBLIC_APP_URL: 'https://app.artimir.fr/' },
      location: localLocation,
    }),
    'https://app.artimir.fr',
  )
})

test('public app URL falls back to the current browser origin', () => {
  assert.equal(
    getPublicAppUrl({
      env: {},
      location: localLocation,
    }),
    'http://192.168.1.40:5173',
  )
})

test('public phone base URL uses the explicit public HTTPS origin only', () => {
  assert.equal(
    getPublicPhoneBaseUrl({
      env: {
        VITE_PUBLIC_PHONE_BASE_URL: 'https://phone.artimir.fr/',
        VITE_PUBLIC_APP_URL: 'https://app.artimir.fr',
      },
    }),
    'https://phone.artimir.fr',
  )
  assert.equal(
    getPublicPhoneBaseUrl({
      env: { VITE_PUBLIC_APP_URL: 'https://app.artimir.fr/' },
    }),
    'https://app.artimir.fr',
  )
  assert.equal(
    getPublicPhoneBaseUrl({
      env: {},
      location: localLocation,
    }),
    null,
  )
})

test('public phone base URL refuses localhost and private network origins', () => {
  for (const value of [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://192.168.1.20:5173',
    'http://10.200.20.38:5173',
    'https://localhost',
    'https://127.0.0.1',
    'https://192.168.1.20',
    'https://10.200.20.38',
  ]) {
    assert.equal(
      normalizePublicPhoneOrigin(value),
      null,
      `expected ${value} to be rejected`,
    )
  }
})

test('runtime URL normalization only trims surrounding and trailing slashes', () => {
  assert.equal(
    normalizeRuntimeOrigin('  https://api.artimir.fr/socket/  '),
    'https://api.artimir.fr/socket',
  )
  assert.equal(normalizeRuntimeOrigin(''), null)
})

test('motor service URL stays independent from Socket.IO and public app URLs', () => {
  assert.notEqual(
    heightAdjustmentConfig.motorServiceUrl,
    getSocketUrl({
      env: { VITE_SOCKET_URL: 'https://api.artimir.fr' },
      location: localLocation,
    }),
  )
  assert.notEqual(
    heightAdjustmentConfig.motorServiceUrl,
    getPublicAppUrl({
      env: { VITE_PUBLIC_APP_URL: 'https://app.artimir.fr' },
      location: localLocation,
    }),
  )
  assert.match(heightAdjustmentConfig.motorServiceUrl, /^http:\/\/127\.0\.0\.1:/)
})

test('motor service URL uses VITE_MOTOR_SERVICE_URL or the local 8000 fallback only', () => {
  assert.equal(
    getMotorServiceUrl({
      env: { VITE_MOTOR_SERVICE_URL: 'http://127.0.0.1:8000/' },
    }),
    'http://127.0.0.1:8000',
  )
  assert.equal(
    getMotorServiceUrl({
      env: {
        VITE_PUBLIC_APP_URL: 'https://app.artimir.fr',
        VITE_SOCKET_URL: 'https://api.artimir.fr',
      },
    }),
    'http://127.0.0.1:8000',
  )
})
