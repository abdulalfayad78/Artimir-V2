import {
  CLIENT_ROLES,
  SESSION_STATUSES,
  SOCKET_EVENTS,
  createEventEnvelope,
} from '../shared/sessionProtocol.js'
import { toMappingSessionState } from '../shared/mappingSessionAdapter.js'
import { createNetworkUrls, createPhoneQrCode } from './network.js'
import { logServerSession } from './sessionLogger.js'
import { toPublicSession } from './sessionStore.js'

const supportedLanguages = new Set(['fr', 'en', 'ar', 'es'])
const sessionIdPattern = /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/
const knownSocketEvents = new Set(Object.values(SOCKET_EVENTS))
const defaultPhoneHeartbeatTimeoutMs = 15_000
const phoneSetupStatuses = new Set([
  SESSION_STATUSES.phoneConnected,
  SESSION_STATUSES.languageSelected,
  SESSION_STATUSES.profileInProgress,
  SESSION_STATUSES.profileCompleted,
  SESSION_STATUSES.customizationInProgress,
  SESSION_STATUSES.customizationCompleted,
])

function roomName(sessionId) {
  return `session:${sessionId}`
}

function isValidSessionId(sessionId) {
  return (
    typeof sessionId === 'string' &&
    sessionIdPattern.test(sessionId)
  )
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function acknowledge(callback, response) {
  if (typeof callback === 'function') {
    callback(response)
  }
}

function createSocketError(code, message = code) {
  return {
    ok: false,
    error: {
      code,
      message,
    },
  }
}

async function createPhonePairing({
  localAddress,
  clientPort,
  serverPort,
  clientProtocol,
  publicAppOrigin,
  sessionId,
}) {
  const urls = createNetworkUrls({
    localAddress,
    clientPort,
    serverPort,
    clientProtocol,
    publicAppOrigin,
    sessionId,
  })
  const qrCodeDataUrl = urls.phoneUrl
    ? await createPhoneQrCode(urls.phoneUrl)
    : null

  if (urls.phoneUrlError) {
    logServerSession('qr:phone-url-missing', {
      sessionCode: sessionId,
      message: urls.phoneUrlError,
      qrMode: urls.qrMode,
    })
  }

  return {
    phoneUrl: urls.phoneUrl,
    phoneBaseUrl: urls.phoneBaseUrl,
    qrUrl: urls.phoneUrl,
    qrMode: urls.qrMode,
    qrError: urls.phoneUrlError,
    qrCodeDataUrl,
  }
}

function registerSocketHandlers(
  io,
  store,
  {
    clientPort = 5173,
    serverPort = 3001,
    clientProtocol = 'http',
    localAddress,
    publicPhoneBaseUrl,
    publicAppOrigin,
    phoneHeartbeatTimeoutMs = defaultPhoneHeartbeatTimeoutMs,
    now = () => Date.now(),
  } = {},
) {
  const emitSessionState = (session) => {
    io.to(roomName(session.id)).emit(
      SOCKET_EVENTS.sessionState,
      createEventEnvelope(session.id, toPublicSession(session)),
    )

    const mappingState = toMappingSessionState(session)

    if (mappingState) {
      io.to(roomName(session.id)).emit(
        SOCKET_EVENTS.mappingState,
        mappingState,
      )
    }
  }

  const releasePhone = (
    session,
    {
      reason,
      socketId = null,
      resetSetup = true,
      notify = true,
    } = {},
  ) => {
    if (!session?.phoneClientId && !session?.phoneSocketId && !session?.phoneConnected) {
      return session
    }

    const previousPhoneClientId = session.phoneClientId
    const shouldResetSetup =
      resetSetup && phoneSetupStatuses.has(session.status)

    if (shouldResetSetup) {
      store.reset(session.id)
      session = store.get(session.id)
    } else {
      session.phoneConnected = false
      session.phoneSocketId = null
      session.phoneClientId = null
      session.phoneLastSeenAt = null
      store.touch(session)
    }

    logServerSession('phone:released', {
      sessionCode: session.id,
      socketId,
      previousPhoneClientId,
      reason,
      sessionStatus: session.status,
    })

    if (notify) {
      io.to(roomName(session.id)).emit(
        SOCKET_EVENTS.phoneDisconnected,
        createEventEnvelope(session.id, {
          connected: false,
          reason,
        }),
      )
      emitSessionState(session)
    }

    return session
  }

  const releaseStalePhoneIfNeeded = (session) => {
    if (!session?.phoneClientId) {
      return session
    }

    const phoneSocket = session.phoneSocketId
      ? io.sockets.sockets.get(session.phoneSocketId)
      : null
    const hasActiveSocket = Boolean(phoneSocket?.connected)
    const lastSeenAt = Number.isFinite(session.phoneLastSeenAt)
      ? session.phoneLastSeenAt
      : null
    const heartbeatAgeMs =
      lastSeenAt === null ? Infinity : now() - lastSeenAt

    if (!hasActiveSocket || heartbeatAgeMs > phoneHeartbeatTimeoutMs) {
      const releasedSession = releasePhone(session, {
        reason: !hasActiveSocket
          ? 'socket_inactive'
          : 'heartbeat_stale',
        socketId: session.phoneSocketId,
        resetSetup: true,
        notify: true,
      })

      if (hasActiveSocket) {
        phoneSocket.disconnect(true)
      }

      return releasedSession
    }

    return session
  }

  const fail = (
    socket,
    callback,
    code,
    message = code,
    sessionId = null,
  ) => {
    const response = createSocketError(code, message)
    socket.emit(
      SOCKET_EVENTS.sessionError,
      createEventEnvelope(sessionId, response.error),
    )
    acknowledge(callback, response)
  }

  const requireSession = (
    socket,
    envelope,
    callback,
    allowedRole,
  ) => {
    if (!isObject(envelope) || !isValidSessionId(envelope.sessionId)) {
      fail(socket, callback, 'INVALID_ENVELOPE')
      return null
    }

    const session = store.get(envelope.sessionId, { touch: true })

    if (!session) {
      fail(
        socket,
        callback,
        'SESSION_NOT_FOUND',
        'Session unavailable or expired',
        envelope.sessionId,
      )
      return null
    }

    if (
      socket.data.sessionId !== session.id ||
      socket.data.role !== allowedRole
    ) {
      fail(
        socket,
        callback,
        'ROLE_NOT_ALLOWED',
        'This client role cannot send this event',
        session.id,
      )
      return null
    }

    return {
      session,
      payload: isObject(envelope.payload) ? envelope.payload : {},
    }
  }

  const transition = (
    socket,
    callback,
    session,
    nextStatus,
    patch = {},
  ) => {
    try {
      const updatedSession = store.transition(
        session.id,
        nextStatus,
        patch,
      )
      emitSessionState(updatedSession)
      acknowledge(callback, {
        ok: true,
        session: toPublicSession(updatedSession),
      })
      return updatedSession
    } catch (error) {
      fail(
        socket,
        callback,
        'INVALID_TRANSITION',
        error.message,
        session.id,
      )
      return null
    }
  }

  io.on('connection', (socket) => {
    logServerSession('socket:connected', {
      socketId: socket.id,
    })

    socket.onAny((eventName, ...args) => {
      if (knownSocketEvents.has(eventName)) {
        return
      }

      const callback = args.at(-1)
      fail(
        socket,
        typeof callback === 'function' ? callback : null,
        'UNKNOWN_EVENT',
        'Unknown Socket.IO event',
        socket.data.sessionId ?? null,
      )
    })

    socket.on(
      SOCKET_EVENTS.sessionCreate,
      async (envelope = {}, callback) => {
        const payload = isObject(envelope.payload)
          ? envelope.payload
          : {}

        if (
          payload.role !== CLIENT_ROLES.display ||
          typeof payload.clientId !== 'string'
        ) {
          fail(socket, callback, 'INVALID_DISPLAY_IDENTITY')
          return
        }

        const previousSession = store.get(socket.data.sessionId)

        if (
          previousSession &&
          socket.data.role === CLIENT_ROLES.display &&
          previousSession.displaySocketId === socket.id
        ) {
          previousSession.displayConnected = false
          previousSession.displaySocketId = null
          store.touch(previousSession)
          await socket.leave(roomName(previousSession.id))
        }

        const session = store.create()
        session.displayConnected = true
        session.displaySocketId = socket.id
        session.displayClientId = payload.clientId
        store.touch(session)

        socket.data.role = CLIENT_ROLES.display
        socket.data.sessionId = session.id
        socket.data.clientId = payload.clientId
        await socket.join(roomName(session.id))

        const pairing = await createPhonePairing({
          localAddress,
          clientPort,
          serverPort,
          clientProtocol,
          publicAppOrigin:
            payload.publicPhoneBaseUrl ??
            payload.publicAppUrl ??
            publicPhoneBaseUrl ??
            publicAppOrigin,
          sessionId: session.id,
        })
        const response = {
          ok: true,
          session: toPublicSession(session),
          ...pairing,
        }

        socket.emit(
          SOCKET_EVENTS.sessionCreated,
          createEventEnvelope(session.id, response),
        )
        acknowledge(callback, response)
        emitSessionState(session)
      },
    )

    socket.on(
      SOCKET_EVENTS.sessionJoin,
      async (envelope = {}, callback) => {
        const { sessionId } = envelope
        const payload = isObject(envelope.payload)
          ? envelope.payload
          : {}
        const { role, clientId } = payload
        logServerSession('session:join-received', {
          socketId: socket.id,
          sessionCode: sessionId,
          role,
          clientId,
        })

        if (
          !isValidSessionId(sessionId) ||
          !Object.values(CLIENT_ROLES).includes(role) ||
          typeof clientId !== 'string' ||
          clientId.length < 8
        ) {
          fail(socket, callback, 'INVALID_JOIN_REQUEST', undefined, sessionId)
          return
        }

        const session = store.get(sessionId, { touch: true })

        if (!session) {
          logServerSession('session:join-session-not-found', {
            socketId: socket.id,
            sessionCode: sessionId,
            clientId,
          })
          fail(
            socket,
            callback,
            'SESSION_NOT_FOUND',
            undefined,
            sessionId,
          )
          return
        }

        const freshSession =
          role === CLIENT_ROLES.phone
            ? releaseStalePhoneIfNeeded(session)
            : session

        logServerSession('session:join-session-found', {
          socketId: socket.id,
          sessionCode: freshSession.id,
          clientId,
          sessionStatus: freshSession.status,
          phoneAlreadyAssociated: Boolean(freshSession.phoneClientId),
        })

        const socketKey =
          role === CLIENT_ROLES.phone
            ? 'phoneSocketId'
            : 'displaySocketId'
        const clientKey =
          role === CLIENT_ROLES.phone
            ? 'phoneClientId'
            : 'displayClientId'
        const connectedKey =
          role === CLIENT_ROLES.phone
            ? 'phoneConnected'
            : 'displayConnected'
        const existingSocketId = freshSession[socketKey]
        const existingClientId = freshSession[clientKey]
        const existingSocket = existingSocketId
          ? io.sockets.sockets.get(existingSocketId)
          : null
        const sameClientReconnect =
          Boolean(existingClientId) &&
          existingClientId === clientId

        if (
          role === CLIENT_ROLES.phone &&
          existingClientId &&
          existingClientId !== clientId
        ) {
          logServerSession('session:join-phone-refused', {
            socketId: socket.id,
            sessionCode: sessionId,
            clientId,
            existingClientId,
            reason: 'SESSION_ALREADY_USED',
          })
          fail(
            socket,
            callback,
            'SESSION_ALREADY_USED',
            'This session already has a phone',
            sessionId,
          )
          return
        }

        freshSession[socketKey] = socket.id
        freshSession[clientKey] = clientId
        freshSession[connectedKey] = true
        if (role === CLIENT_ROLES.phone) {
          freshSession.phoneLastSeenAt = now()
        }
        socket.data.role = role
        socket.data.sessionId = sessionId
        socket.data.clientId = clientId
        store.touch(freshSession)
        await socket.join(roomName(sessionId))

        if (
          existingSocket?.connected &&
          existingSocket.id !== socket.id &&
          existingClientId === clientId
        ) {
          logServerSession('session:reconnect-replacing-socket', {
            sessionCode: sessionId,
            clientId,
            previousSocketId: existingSocket.id,
            nextSocketId: socket.id,
          })
          existingSocket.disconnect(true)
        }

        if (
          role === CLIENT_ROLES.phone &&
          freshSession.status === SESSION_STATUSES.waitingForPhone
        ) {
          store.transition(
            freshSession.id,
            SESSION_STATUSES.phoneConnected,
          )
          freshSession.status = SESSION_STATUSES.phoneConnected
        }

        logServerSession(
          sameClientReconnect
            ? 'session:reconnect-accepted'
            : 'session:join-accepted',
          {
            socketId: socket.id,
            sessionCode: sessionId,
            role,
            clientId,
            sessionStatus: freshSession.status,
          },
        )

        let pairing = {}

        if (role === CLIENT_ROLES.display) {
          pairing = await createPhonePairing({
            localAddress,
            clientPort,
            serverPort,
            clientProtocol,
            publicAppOrigin: publicPhoneBaseUrl ?? publicAppOrigin,
            sessionId,
          })
        }

        const response = {
          ok: true,
          role,
          session: toPublicSession(freshSession),
          ...pairing,
        }
        socket.emit(
          SOCKET_EVENTS.sessionJoined,
          createEventEnvelope(sessionId, response),
        )
        acknowledge(callback, response)

        if (role === CLIENT_ROLES.phone) {
          io.to(roomName(sessionId)).emit(
            SOCKET_EVENTS.phoneConnected,
            createEventEnvelope(sessionId, {
              connected: true,
            }),
          )
        }

        emitSessionState(freshSession)
      },
    )

    socket.on(SOCKET_EVENTS.phoneHeartbeat, (envelope, callback) => {
      const result = requireSession(
        socket,
        envelope,
        callback,
        CLIENT_ROLES.phone,
      )

      if (!result) {
        return
      }

      result.session.phoneLastSeenAt = now()
      result.session.phoneConnected = true
      result.session.phoneSocketId = socket.id
      store.touch(result.session)
      acknowledge(callback, {
        ok: true,
        session: toPublicSession(result.session),
      })
    })

    socket.on(SOCKET_EVENTS.phoneLeaveSession, (envelope, callback) => {
      const result = requireSession(
        socket,
        envelope,
        callback,
        CLIENT_ROLES.phone,
      )

      if (!result) {
        return
      }

      const session = releasePhone(result.session, {
        reason: 'phone_leave_session',
        socketId: socket.id,
        resetSetup: true,
        notify: true,
      })
      socket.data.role = null
      socket.data.sessionId = null
      socket.data.clientId = null
      socket.leave(roomName(session.id))
      acknowledge(callback, {
        ok: true,
        session: toPublicSession(session),
      })
    })

    socket.on(
      SOCKET_EVENTS.phoneLanguageSelected,
      (envelope, callback) => {
        const result = requireSession(
          socket,
          envelope,
          callback,
          CLIENT_ROLES.phone,
        )

        if (!result) {
          return
        }

        if (!supportedLanguages.has(result.payload.language)) {
          fail(
            socket,
            callback,
            'INVALID_LANGUAGE',
            undefined,
            result.session.id,
          )
          return
        }

        transition(
          socket,
          callback,
          result.session,
          SESSION_STATUSES.languageSelected,
          { language: result.payload.language },
        )
      },
    )

    socket.on(
      SOCKET_EVENTS.phoneProfileUpdated,
      (envelope, callback) => {
        const result = requireSession(
          socket,
          envelope,
          callback,
          CLIENT_ROLES.phone,
        )

        if (!result) {
          return
        }

        const profile = result.payload.profile

        if (!isObject(profile)) {
          fail(
            socket,
            callback,
            'INVALID_PROFILE',
            undefined,
            result.session.id,
          )
          return
        }

        const complete = Boolean(
          profile.ageRange && profile.artFamiliarity,
        )

        transition(
          socket,
          callback,
          result.session,
          complete
            ? SESSION_STATUSES.profileCompleted
            : SESSION_STATUSES.profileInProgress,
          { profile },
        )
      },
    )

    socket.on(
      SOCKET_EVENTS.phoneCustomizationUpdated,
      (envelope, callback) => {
        const result = requireSession(
          socket,
          envelope,
          callback,
          CLIENT_ROLES.phone,
        )

        if (!result) {
          return
        }

        const customization = result.payload.customization

        if (
          customization !== null &&
          !isObject(customization)
        ) {
          fail(
            socket,
            callback,
            'INVALID_CUSTOMIZATION',
            undefined,
            result.session.id,
          )
          return
        }

        transition(
          socket,
          callback,
          result.session,
          customization?.experienceStyle
            ? SESSION_STATUSES.customizationCompleted
            : SESSION_STATUSES.customizationInProgress,
          { customization },
        )
      },
    )

    socket.on(
      SOCKET_EVENTS.phoneStartPositioning,
      (envelope, callback) => {
        const result = requireSession(
          socket,
          envelope,
          callback,
          CLIENT_ROLES.phone,
        )

        if (!result) {
          return
        }

        const { language, profile, customization } = result.payload

        if (
          !supportedLanguages.has(language) ||
          !isObject(profile) ||
          !profile.ageRange ||
          !profile.artFamiliarity ||
          !isObject(customization) ||
          !customization.experienceStyle
        ) {
          fail(
            socket,
            callback,
            'INCOMPLETE_CONFIGURATION',
            undefined,
            result.session.id,
          )
          return
        }

        transition(
          socket,
          callback,
          result.session,
          SESSION_STATUSES.startPositioning,
          {
            language,
            profile,
            customization,
            activeScene: 'positioning',
          },
        )
      },
    )

    socket.on(SOCKET_EVENTS.phoneCancel, (envelope, callback) => {
      const result = requireSession(
        socket,
        envelope,
        callback,
        CLIENT_ROLES.phone,
      )

      if (result) {
        transition(
          socket,
          callback,
          result.session,
          SESSION_STATUSES.sessionCompleted,
          { activeScene: null },
        )
      }
    })

    const displayTransitions = [
      [
        SOCKET_EVENTS.displayReady,
        SESSION_STATUSES.waitingForPhone,
        'waiting',
      ],
      [
        SOCKET_EVENTS.displayPositioningStarted,
        SESSION_STATUSES.positioningActive,
        'positioning',
      ],
      [
        SOCKET_EVENTS.displayPositioningCompleted,
        SESSION_STATUSES.positioningCompleted,
        'height-adjustment',
      ],
      [
        SOCKET_EVENTS.displayHeightAdjustmentStarted,
        SESSION_STATUSES.heightAdjustment,
        'height-adjustment',
      ],
      [
        SOCKET_EVENTS.displayExperienceStarted,
        SESSION_STATUSES.experienceActive,
        'experience',
      ],
      [
        SOCKET_EVENTS.displayResultReady,
        SESSION_STATUSES.resultReady,
        'result',
      ],
    ]

    displayTransitions.forEach(([eventName, status, activeScene]) => {
      socket.on(eventName, (envelope, callback) => {
        const result = requireSession(
          socket,
          envelope,
          callback,
          CLIENT_ROLES.display,
        )

        if (result) {
          transition(
            socket,
            callback,
            result.session,
            status,
            { activeScene },
          )
        }
      })
    })

    socket.on(SOCKET_EVENTS.displayError, (envelope, callback) => {
      const result = requireSession(
        socket,
        envelope,
        callback,
        CLIENT_ROLES.display,
      )

      if (result) {
        transition(
          socket,
          callback,
          result.session,
          SESSION_STATUSES.error,
          {
            error:
              typeof result.payload.message === 'string'
                ? result.payload.message.slice(0, 200)
                : 'DISPLAY_ERROR',
          },
        )
      }
    })

    socket.on(SOCKET_EVENTS.sessionReset, (envelope, callback) => {
      const result = requireSession(
        socket,
        envelope,
        callback,
        CLIENT_ROLES.display,
      )

      if (!result) {
        return
      }

      const session = store.reset(result.session.id)
      emitSessionState(session)
      acknowledge(callback, {
        ok: true,
        session: toPublicSession(session),
      })
    })

    socket.on(SOCKET_EVENTS.sessionComplete, (envelope, callback) => {
      const result = requireSession(
        socket,
        envelope,
        callback,
        CLIENT_ROLES.display,
      )

      if (result) {
        transition(
          socket,
          callback,
          result.session,
          SESSION_STATUSES.sessionCompleted,
          { activeScene: null },
        )
      }
    })

    socket.on('disconnect', (reason) => {
      const { sessionId, role } = socket.data
      const session = store.get(sessionId)

      if (!session || !role) {
        logServerSession('socket:disconnected-without-session', {
          socketId: socket.id,
          reason,
        })
        return
      }

      if (
        role === CLIENT_ROLES.phone &&
        session.phoneSocketId === socket.id
      ) {
        releasePhone(session, {
          reason,
          socketId: socket.id,
          resetSetup: true,
          notify: true,
        })
        logServerSession('socket:disconnected-session-kept', {
          socketId: socket.id,
          sessionCode: session.id,
          role,
          reason,
          sessionStatus: store.get(session.id)?.status,
        })
        return
      }

      if (
        role === CLIENT_ROLES.display &&
        session.displaySocketId === socket.id
      ) {
        session.displayConnected = false
        session.displaySocketId = null
      }

      store.touch(session)
      emitSessionState(session)
      logServerSession('socket:disconnected-session-kept', {
        socketId: socket.id,
        sessionCode: session.id,
        role,
        reason,
        sessionStatus: session.status,
      })
    })
  })

  return {
    emitSessionState,
  }
}

export { registerSocketHandlers }
