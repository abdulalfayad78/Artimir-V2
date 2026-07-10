import assert from 'node:assert/strict'
import test from 'node:test'
import { io as createClient } from 'socket.io-client'
import packageJson from '../package.json' with { type: 'json' }
import { createArtimirServer } from '../server/index.js'
import {
  CLIENT_ROLES,
  SOCKET_EVENTS,
} from '../shared/sessionProtocol.js'

function withTemporaryEnv(patch, callback) {
  const previousValues = new Map()

  Object.keys(patch).forEach((key) => {
    previousValues.set(key, process.env[key])
    if (patch[key] === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = patch[key]
    }
  })

  try {
    return callback()
  } finally {
    previousValues.forEach((value, key) => {
      if (value === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = value
      }
    })
  }
}

function connectClient(url, extraOptions = {}) {
  return new Promise((resolve, reject) => {
    const socket = createClient(url, {
      forceNew: true,
      reconnection: false,
      transports: ['websocket'],
      ...extraOptions,
    })
    socket.once('connect', () => resolve(socket))
    socket.once('connect_error', reject)
  })
}

function emitAck(socket, eventName, sessionId, payload = {}) {
  return new Promise((resolve) => {
    socket.emit(eventName, { sessionId, payload }, resolve)
  })
}

test('server config uses process.env.PORT and binds to 0.0.0.0 by default', () => {
  withTemporaryEnv(
    {
      ARTIMIR_SERVER_PORT: '3001',
      PORT: '42123',
    },
    () => {
      const server = createArtimirServer()

      assert.equal(server.config.port, 42123)
      assert.equal(server.config.host, '0.0.0.0')

      return server.close()
    },
  )
})

test('health endpoint returns the public Render-safe payload', async (t) => {
  const server = createArtimirServer({
    localAddress: '127.0.0.1',
    port: 0,
    publicAppOrigins: ['https://artimir-app.onrender.com'],
  })
  const address = await server.listen()

  t.after(() => server.close())

  const response = await fetch(`http://127.0.0.1:${address.port}/health`, {
    headers: {
      Origin: 'https://artimir-app.onrender.com',
    },
  })
  const payload = await response.json()

  assert.equal(response.status, 200)
  assert.equal(
    response.headers.get('access-control-allow-origin'),
    'https://artimir-app.onrender.com',
  )
  assert.deepEqual(payload, {
    status: 'ok',
    service: 'artimir-realtime',
  })
  assert.equal(JSON.stringify(payload).includes('127.0.0.1:8000'), false)
})

test('production CORS exposes headers for Render frontend and not for another origin', async (t) => {
  const server = createArtimirServer({
    localAddress: '127.0.0.1',
    port: 0,
    publicAppOrigins: ['https://artimir-app.onrender.com'],
  })
  const address = await server.listen()

  t.after(() => server.close())

  const allowedResponse = await fetch(
    `http://127.0.0.1:${address.port}/health`,
    {
      headers: {
        Origin: 'https://artimir-app.onrender.com',
      },
    },
  )
  const refusedResponse = await fetch(
    `http://127.0.0.1:${address.port}/health`,
    {
      headers: {
        Origin: 'https://not-artimir.example',
      },
    },
  )

  assert.equal(
    allowedResponse.headers.get('access-control-allow-origin'),
    'https://artimir-app.onrender.com',
  )
  assert.equal(
    refusedResponse.headers.get('access-control-allow-origin'),
    null,
  )
})

test('session payloads and QR links never expose the local motor URL', async (t) => {
  const server = createArtimirServer({
    localAddress: '127.0.0.1',
    port: 0,
    publicAppOrigins: ['https://artimir-app.onrender.com'],
  })
  const address = await server.listen()
  const socket = await connectClient(`http://127.0.0.1:${address.port}`)

  t.after(async () => {
    socket.disconnect()
    await server.close()
  })

  const response = await emitAck(
    socket,
    SOCKET_EVENTS.sessionCreate,
    null,
    {
      role: CLIENT_ROLES.display,
      clientId: 'display-no-motor-url',
      publicAppUrl: 'https://artimir-app.onrender.com',
    },
  )
  const serialized = JSON.stringify(response)

  assert.equal(response.ok, true)
  assert.match(
    response.phoneUrl,
    /^https:\/\/artimir-app\.onrender\.com\/#\/phone\/languages\?session=/,
  )
  assert.equal(serialized.includes('127.0.0.1:8000'), false)
  assert.equal(serialized.includes('VITE_MOTOR_SERVICE_URL'), false)
})

test('package exposes npm run start:server for the Render web service', () => {
  assert.equal(
    packageJson.scripts['start:server'],
    'node server/index.js',
  )
})
