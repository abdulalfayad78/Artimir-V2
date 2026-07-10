import assert from 'node:assert/strict'
import test from 'node:test'
import { io as createClient } from 'socket.io-client'
import {
  CLIENT_ROLES,
  SESSION_STATUSES,
  SOCKET_EVENTS,
} from '../shared/sessionProtocol.js'
import { createArtimirServer } from '../server/index.js'

function connectClient(url) {
  return new Promise((resolve, reject) => {
    const socket = createClient(url, {
      forceNew: true,
      reconnection: false,
      transports: ['websocket'],
    })
    socket.once('connect', () => resolve(socket))
    socket.once('connect_error', reject)
  })
}

function emitAck(socket, eventName, sessionId, payload = {}) {
  return new Promise((resolve) => {
    socket.emit(
      eventName,
      {
        sessionId,
        payload,
      },
      resolve,
    )
  })
}

test('phone and display complete the synchronized positioning handoff', async (t) => {
  const server = createArtimirServer({
    port: 0,
    localAddress: '127.0.0.1',
    sessionTtlMs: 30_000,
  })
  const address = await server.listen()
  const url = `http://127.0.0.1:${address.port}`
  const display = await connectClient(url)
  const phone = await connectClient(url)
  const secondPhone = await connectClient(url)

  t.after(async () => {
    display.disconnect()
    phone.disconnect()
    secondPhone.disconnect()
    await server.close()
  })

  const created = await emitAck(
    display,
    SOCKET_EVENTS.sessionCreate,
    null,
    {
      role: CLIENT_ROLES.display,
      clientId: 'display-client-primary',
    },
  )

  assert.equal(created.ok, true)
  assert.match(created.session.id, /^[A-Z0-9]{6}$/)
  assert.match(created.phoneUrl, new RegExp(created.session.id))
  assert.match(created.qrCodeDataUrl, /^data:image\/png;base64,/)

  const sessionId = created.session.id
  const joined = await emitAck(
    phone,
    SOCKET_EVENTS.sessionJoin,
    sessionId,
    {
      role: CLIENT_ROLES.phone,
      clientId: 'phone-client-primary',
    },
  )
  assert.equal(joined.session.status, SESSION_STATUSES.phoneConnected)

  const rejectedPhone = await emitAck(
    secondPhone,
    SOCKET_EVENTS.sessionJoin,
    sessionId,
    {
      role: CLIENT_ROLES.phone,
      clientId: 'phone-client-secondary',
    },
  )
  assert.equal(rejectedPhone.ok, false)
  assert.equal(rejectedPhone.error.code, 'SESSION_ALREADY_USED')

  const unauthorized = await emitAck(
    phone,
    SOCKET_EVENTS.displayPositioningStarted,
    sessionId,
  )
  assert.equal(unauthorized.error.code, 'ROLE_NOT_ALLOWED')

  await emitAck(
    phone,
    SOCKET_EVENTS.phoneLanguageSelected,
    sessionId,
    { language: 'fr' },
  )
  await emitAck(
    phone,
    SOCKET_EVENTS.phoneProfileUpdated,
    sessionId,
    {
      profile: {
        ageRange: '18_30',
        artFamiliarity: 'regular',
      },
    },
  )
  await emitAck(
    phone,
    SOCKET_EVENTS.phoneCustomizationUpdated,
    sessionId,
    {
      customization: {
        experienceStyle: 'interactive',
      },
    },
  )

  const startStatePromise = new Promise((resolve) => {
    const handleState = (envelope) => {
      if (
        envelope.payload.status ===
        SESSION_STATUSES.startPositioning
      ) {
        display.off(SOCKET_EVENTS.sessionState, handleState)
        resolve(envelope.payload)
      }
    }
    display.on(SOCKET_EVENTS.sessionState, handleState)
  })

  const started = await emitAck(
    phone,
    SOCKET_EVENTS.phoneStartPositioning,
    sessionId,
    {
      language: 'fr',
      profile: {
        ageRange: '18_30',
        artFamiliarity: 'regular',
      },
      customization: {
        experienceStyle: 'interactive',
      },
    },
  )
  const broadcastStartState = await startStatePromise

  assert.equal(
    started.session.status,
    SESSION_STATUSES.startPositioning,
  )
  assert.equal(
    broadcastStartState.status,
    SESSION_STATUSES.startPositioning,
  )

  const positioningActive = await emitAck(
    display,
    SOCKET_EVENTS.displayPositioningStarted,
    sessionId,
  )
  assert.equal(
    positioningActive.session.status,
    SESSION_STATUSES.positioningActive,
  )

  const positioningCompleted = await emitAck(
    display,
    SOCKET_EVENTS.displayPositioningCompleted,
    sessionId,
  )
  assert.equal(
    positioningCompleted.session.status,
    SESSION_STATUSES.positioningCompleted,
  )
})

test('invalid sessions are rejected', async (t) => {
  const server = createArtimirServer({
    port: 0,
    localAddress: '127.0.0.1',
  })
  const address = await server.listen()
  const socket = await connectClient(
    `http://127.0.0.1:${address.port}`,
  )

  t.after(async () => {
    socket.disconnect()
    await server.close()
  })

  const response = await emitAck(
    socket,
    SOCKET_EVENTS.sessionJoin,
    'BAD999',
    {
      role: CLIENT_ROLES.phone,
      clientId: 'phone-client-invalid',
    },
  )

  assert.equal(response.ok, false)
  assert.equal(response.error.code, 'SESSION_NOT_FOUND')
})

test('malformed session ids and unknown socket events are rejected', async (t) => {
  const server = createArtimirServer({
    port: 0,
    localAddress: '127.0.0.1',
  })
  const address = await server.listen()
  const socket = await connectClient(
    `http://127.0.0.1:${address.port}`,
  )

  t.after(async () => {
    socket.disconnect()
    await server.close()
  })

  const malformedJoin = await emitAck(
    socket,
    SOCKET_EVENTS.sessionJoin,
    'not-a-code',
    {
      role: CLIENT_ROLES.phone,
      clientId: 'phone-client-invalid',
    },
  )
  assert.equal(malformedJoin.ok, false)
  assert.equal(malformedJoin.error.code, 'INVALID_JOIN_REQUEST')

  const unknown = await new Promise((resolve) => {
    socket.emit('motor:move-raw', { command: 'MOVE:500' }, resolve)
  })
  assert.equal(unknown.ok, false)
  assert.equal(unknown.error.code, 'UNKNOWN_EVENT')
})

test('display session creation can return a public phone URL for the QR code', async (t) => {
  const server = createArtimirServer({
    port: 0,
    localAddress: '127.0.0.1',
  })
  const address = await server.listen()
  const socket = await connectClient(
    `http://127.0.0.1:${address.port}`,
  )

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
      clientId: 'display-public-url-test',
      publicAppUrl: 'https://app.artimir.fr',
    },
  )

  assert.equal(response.ok, true)
  assert.equal(
    response.phoneUrl,
    `https://app.artimir.fr/#/phone/languages?session=${response.session.id}`,
  )
  assert.match(response.qrCodeDataUrl, /^data:image\/png;base64,/)
})

test('the original phone client can reconnect without opening a second slot', async (t) => {
  const server = createArtimirServer({
    port: 0,
    localAddress: '127.0.0.1',
  })
  const address = await server.listen()
  const url = `http://127.0.0.1:${address.port}`
  const display = await connectClient(url)
  const firstPhoneSocket = await connectClient(url)
  const reconnectedPhoneSocket = await connectClient(url)

  t.after(async () => {
    display.disconnect()
    firstPhoneSocket.disconnect()
    reconnectedPhoneSocket.disconnect()
    await server.close()
  })

  const created = await emitAck(
    display,
    SOCKET_EVENTS.sessionCreate,
    null,
    {
      role: CLIENT_ROLES.display,
      clientId: 'display-reconnect-test',
    },
  )
  const identity = {
    role: CLIENT_ROLES.phone,
    clientId: 'stable-phone-client-id',
  }

  const firstJoin = await emitAck(
    firstPhoneSocket,
    SOCKET_EVENTS.sessionJoin,
    created.session.id,
    identity,
  )
  const secondJoin = await emitAck(
    reconnectedPhoneSocket,
    SOCKET_EVENTS.sessionJoin,
    created.session.id,
    identity,
  )

  assert.equal(firstJoin.ok, true)
  assert.equal(secondJoin.ok, true)
  assert.equal(secondJoin.session.phoneConnected, true)
  assert.equal(firstPhoneSocket.connected, false)
})
