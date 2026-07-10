import {
  SESSION_STATUSES,
  canTransitionSession,
} from '../shared/sessionProtocol.js'

const SESSION_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'

function createSessionId(length = 6) {
  return Array.from({ length }, () => {
    const index = Math.floor(Math.random() * SESSION_ALPHABET.length)
    return SESSION_ALPHABET[index]
  }).join('')
}

function toPublicSession(session) {
  if (!session) {
    return null
  }

  const {
    phoneSocketId: _phoneSocketId,
    displaySocketId: _displaySocketId,
    phoneClientId: _phoneClientId,
    displayClientId: _displayClientId,
    ...publicSession
  } = session

  return { ...publicSession }
}

class SessionStore {
  constructor({ ttlMs = 900_000, now = () => Date.now() } = {}) {
    this.sessions = new Map()
    this.ttlMs = ttlMs
    this.now = now
  }

  create() {
    let id = createSessionId()

    while (this.sessions.has(id)) {
      id = createSessionId()
    }

    const timestamp = this.now()
    const session = {
      id,
      createdAt: timestamp,
      updatedAt: timestamp,
      expiresAt: timestamp + this.ttlMs,
      status: SESSION_STATUSES.waitingForPhone,
      phoneConnected: false,
      displayConnected: false,
      phoneSocketId: null,
      displaySocketId: null,
      phoneClientId: null,
      displayClientId: null,
      phoneLastSeenAt: null,
      language: null,
      profile: null,
      customization: null,
      activeScene: 'waiting',
      error: null,
    }

    this.sessions.set(id, session)
    return session
  }

  get(sessionId, { touch = false } = {}) {
    const session = this.sessions.get(sessionId)

    if (!session) {
      return null
    }

    if (session.expiresAt <= this.now()) {
      return null
    }

    if (touch) {
      this.touch(session)
    }

    return session
  }

  touch(session) {
    const timestamp = this.now()
    session.updatedAt = timestamp
    session.expiresAt = timestamp + this.ttlMs
    return session
  }

  update(sessionId, patch) {
    const session = this.get(sessionId)

    if (!session) {
      return null
    }

    Object.assign(session, patch)
    return this.touch(session)
  }

  transition(sessionId, nextStatus, patch = {}) {
    const session = this.get(sessionId)

    if (!session) {
      throw new Error('SESSION_NOT_FOUND')
    }

    if (!canTransitionSession(session.status, nextStatus)) {
      throw new Error(
        `INVALID_TRANSITION:${session.status}:${nextStatus}`,
      )
    }

    const privacyPatch =
      nextStatus === SESSION_STATUSES.sessionCompleted
        ? {
            language: null,
            profile: null,
            customization: null,
            error: null,
          }
        : {}

    return this.update(sessionId, {
      ...privacyPatch,
      ...patch,
      status: nextStatus,
    })
  }

  reset(sessionId) {
    const session = this.get(sessionId)

    if (!session) {
      return null
    }

    const timestamp = this.now()
    Object.assign(session, {
      updatedAt: timestamp,
      expiresAt: timestamp + this.ttlMs,
      status: SESSION_STATUSES.waitingForPhone,
      phoneConnected: false,
      phoneSocketId: null,
      phoneClientId: null,
      phoneLastSeenAt: null,
      language: null,
      profile: null,
      customization: null,
      activeScene: 'waiting',
      error: null,
    })

    return session
  }

  remove(sessionId) {
    const session = this.sessions.get(sessionId) ?? null
    this.sessions.delete(sessionId)
    return session
  }

  getExpired() {
    const timestamp = this.now()

    return [...this.sessions.values()].filter(
      (session) => session.expiresAt <= timestamp,
    )
  }

  clear() {
    this.sessions.clear()
  }
}

export { SessionStore, createSessionId, toPublicSession }
