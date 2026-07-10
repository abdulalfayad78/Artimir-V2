import assert from 'node:assert/strict'
import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
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

async function createStaticFixture(t) {
  const staticDir = await mkdtemp(
    path.join(os.tmpdir(), 'artimir-static-'),
  )
  await mkdir(path.join(staticDir, 'assets'))
  await writeFile(
    path.join(staticDir, 'index.html'),
    '<!doctype html><html><body><div id="root">Artimir React</div></body></html>',
  )
  await writeFile(
    path.join(staticDir, 'assets', 'app.js'),
    'window.__ARTIMIR_TEST__ = true;',
  )

  t.after(() => rm(staticDir, { recursive: true, force: true }))
  return staticDir
}

async function createEmptyStaticFixture(t) {
  const staticDir = await mkdtemp(
    path.join(os.tmpdir(), 'artimir-empty-static-'),
  )

  t.after(() => rm(staticDir, { recursive: true, force: true }))
  return staticDir
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

test('health endpoint handles slash, query string and preserves 404 fallback', async (t) => {
  const staticDir = await createEmptyStaticFixture(t)
  const server = createArtimirServer({
    localAddress: '127.0.0.1',
    port: 0,
    staticDir,
  })
  const address = await server.listen()
  const baseUrl = `http://127.0.0.1:${address.port}`
  const expectedPayload = {
    status: 'ok',
    service: 'artimir-realtime',
  }

  t.after(() => server.close())

  const health = await fetch(`${baseUrl}/health`)
  const healthSlash = await fetch(`${baseUrl}/health/`)
  const healthQuery = await fetch(`${baseUrl}/health?render=1`)
  const unknown = await fetch(`${baseUrl}/unknown`)

  assert.equal(health.status, 200)
  assert.equal(healthSlash.status, 200)
  assert.equal(healthQuery.status, 200)
  assert.match(
    health.headers.get('content-type') ?? '',
    /^application\/json/,
  )
  assert.deepEqual(await health.json(), expectedPayload)
  assert.deepEqual(await healthSlash.json(), expectedPayload)
  assert.deepEqual(await healthQuery.json(), expectedPayload)
  assert.equal(unknown.status, 404)
  assert.notEqual(await unknown.text(), 'Not Found')
})

test('server serves the React build on root and frontend routes', async (t) => {
  const staticDir = await createStaticFixture(t)
  const server = createArtimirServer({
    localAddress: '127.0.0.1',
    port: 0,
    staticDir,
  })
  const address = await server.listen()
  const baseUrl = `http://127.0.0.1:${address.port}`

  t.after(() => server.close())

  const root = await fetch(`${baseUrl}/`)
  const frontendRoute = await fetch(`${baseUrl}/phone/languages`)
  const asset = await fetch(`${baseUrl}/assets/app.js`)

  assert.equal(root.status, 200)
  assert.match(root.headers.get('content-type') ?? '', /^text\/html/)
  assert.match(await root.text(), /Artimir React/)

  assert.equal(frontendRoute.status, 200)
  assert.match(
    frontendRoute.headers.get('content-type') ?? '',
    /^text\/html/,
  )
  assert.match(await frontendRoute.text(), /Artimir React/)

  assert.equal(asset.status, 200)
  assert.match(asset.headers.get('content-type') ?? '', /^text\/javascript/)
  assert.match(await asset.text(), /ARTIMIR_TEST/)
})

test('API and Socket.IO paths are not intercepted by the React fallback', async (t) => {
  const staticDir = await createStaticFixture(t)
  const server = createArtimirServer({
    localAddress: '127.0.0.1',
    port: 0,
    staticDir,
    publicAppOrigins: ['https://artimir-api.onrender.com'],
  })
  const address = await server.listen()
  const baseUrl = `http://127.0.0.1:${address.port}`

  t.after(() => server.close())

  const health = await fetch(`${baseUrl}/health`)
  const socketIo = await fetch(`${baseUrl}/socket.io/not-a-real-route`)
  const postFallback = await fetch(`${baseUrl}/phone/languages`, {
    method: 'POST',
  })

  assert.equal(health.status, 200)
  assert.deepEqual(await health.json(), {
    status: 'ok',
    service: 'artimir-realtime',
  })
  assert.doesNotMatch(await socketIo.text(), /Artimir React/)
  assert.equal(postFallback.status, 404)
  assert.doesNotMatch(await postFallback.text(), /Artimir React/)
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

test('Render public origin can be used as the QR phone URL', async (t) => {
  const server = createArtimirServer({
    localAddress: '127.0.0.1',
    port: 0,
    publicPhoneBaseUrl: 'https://artimir-api.onrender.com',
    publicAppOrigins: ['https://artimir-api.onrender.com'],
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
      clientId: 'display-render-public-url',
    },
  )

  assert.equal(response.ok, true)
  assert.equal(
    response.phoneUrl,
    `https://artimir-api.onrender.com/#/phone/languages?session=${response.session.id}`,
  )
  assert.match(response.qrCodeDataUrl, /^data:image\/png;base64,/)
})

test('package exposes npm run start:server for the Render web service', () => {
  assert.equal(
    packageJson.scripts['start:server'],
    'node server/index.js',
  )
})

test('Render API service builds the frontend before starting Node', async () => {
  const renderYaml = await readFile(
    new URL('../render.yaml', import.meta.url),
    'utf8',
  )

  assert.match(renderYaml, /name:\s*artimir-api/)
  assert.match(
    renderYaml,
    /buildCommand:\s*npm ci && npm --prefix frontend ci && npm run build/,
  )
  assert.match(
    renderYaml,
    /PUBLIC_PHONE_BASE_URL\s*\n\s*value:\s*https:\/\/artimir-api\.onrender\.com/,
  )
  assert.match(
    renderYaml,
    /VITE_PUBLIC_PHONE_BASE_URL\s*\n\s*value:\s*https:\/\/artimir-api\.onrender\.com/,
  )
})
