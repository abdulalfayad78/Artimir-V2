import assert from 'node:assert/strict'
import test from 'node:test'
import {
  SESSION_STATUSES,
} from '../shared/sessionProtocol.js'
import {
  SessionStore,
  toPublicSession,
} from '../server/sessionStore.js'

test('the session store creates, updates and expires sessions', () => {
  let now = 1_000
  const store = new SessionStore({
    ttlMs: 500,
    now: () => now,
  })
  const session = store.create()

  assert.equal(session.status, SESSION_STATUSES.waitingForPhone)
  assert.equal(session.expiresAt, 1_500)

  store.transition(
    session.id,
    SESSION_STATUSES.phoneConnected,
  )
  now = 1_200
  store.update(session.id, { language: 'fr' })
  assert.equal(session.expiresAt, 1_700)

  now = 1_701
  assert.equal(store.get(session.id), null)
  assert.deepEqual(store.getExpired(), [session])
})

test('public sessions never expose socket or client identifiers', () => {
  const store = new SessionStore()
  const session = store.create()
  session.phoneSocketId = 'socket-secret'
  session.phoneClientId = 'client-secret'

  const publicSession = toPublicSession(session)

  assert.equal('phoneSocketId' in publicSession, false)
  assert.equal('phoneClientId' in publicSession, false)
  assert.equal(publicSession.id, session.id)
})

test('invalid state transitions are rejected', () => {
  const store = new SessionStore()
  const session = store.create()

  assert.throws(
    () =>
      store.transition(
        session.id,
        SESSION_STATUSES.positioningActive,
      ),
    /INVALID_TRANSITION/,
  )
})
