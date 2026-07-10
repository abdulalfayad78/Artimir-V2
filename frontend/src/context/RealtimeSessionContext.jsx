import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  CLIENT_ROLES,
  SOCKET_EVENTS,
} from '../../../shared/sessionProtocol.js'
import {
  clearClientSession,
  getOrCreateClientId,
  readStorage,
  storageKeys,
  storeClientSession,
} from '../realtime/clientIdentity'
import {
  cancelScheduledSocketDisconnect,
  getArtimirSocket,
  scheduleSocketDisconnect,
} from '../realtime/socket'
import { getPublicPhoneBaseUrl } from '../realtime/runtimeUrls'
import { logSessionDiagnostic } from '../realtime/sessionDiagnostics'
import RealtimeSessionContext from './RealtimeSessionContext.js'

const acknowledgementTimeoutMs = 6_000

function RealtimeSessionProvider({ children }) {
  const socketRef = useRef(null)
  const manualConnectionRef = useRef(false)
  const connectionPromiseRef = useRef(null)
  const joinRequestRef = useRef(null)
  const identityRef = useRef({
    role: readStorage(storageKeys.role),
    sessionId: readStorage(storageKeys.sessionId),
  })
  const [role, setRole] = useState(identityRef.current.role)
  const [sessionId, setSessionId] = useState(
    identityRef.current.sessionId,
  )
  const [remoteSession, setRemoteSession] = useState(null)
  const [connectionStatus, setConnectionStatus] =
    useState('disconnected')
  const [sessionError, setSessionError] = useState(null)
  const [phoneUrl, setPhoneUrl] = useState(null)
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState(null)
  const [qrDiagnostics, setQrDiagnostics] = useState({
    phoneBaseUrl: null,
    qrUrl: null,
    qrMode: 'unconfigured',
    error: null,
  })

  if (!socketRef.current) {
    socketRef.current = getArtimirSocket()
  }

  const setIdentity = useCallback((nextRole, nextSessionId) => {
    identityRef.current = {
      role: nextRole,
      sessionId: nextSessionId,
    }
    setRole(nextRole)
    setSessionId(nextSessionId)

    if (nextRole && nextSessionId) {
      storeClientSession(nextRole, nextSessionId)
    }
  }, [])

  const emitWithAcknowledgement = useCallback(
    (eventName, envelope) =>
      new Promise((resolve, reject) => {
        const socket = socketRef.current
        let settled = false
        const timer = window.setTimeout(() => {
          if (!settled) {
            settled = true
            reject(new Error('NETWORK_TIMEOUT'))
          }
        }, acknowledgementTimeoutMs)

        socket.emit(eventName, envelope, (response) => {
          if (settled) {
            return
          }

          settled = true
          window.clearTimeout(timer)

          if (!response?.ok) {
            const error = new Error(
              response?.error?.message ?? 'SESSION_ERROR',
            )
            error.code = response?.error?.code ?? 'SESSION_ERROR'
            reject(error)
            return
          }

          resolve(response)
        })
      }),
    [],
  )

  const ensureConnected = useCallback(
    () => {
      if (connectionPromiseRef.current) {
        return connectionPromiseRef.current
      }

      const connectionPromise = new Promise((resolve, reject) => {
        const socket = socketRef.current

        if (socket.connected) {
          resolve(socket)
          return
        }

        let settled = false
        const cleanup = () => {
          socket.off('connect', handleConnect)
          socket.off('connect_error', handleError)
          window.clearTimeout(timer)
        }
        const handleConnect = () => {
          if (!settled) {
            settled = true
            cleanup()
            connectionPromiseRef.current = null
            resolve(socket)
          }
        }
        const handleError = (error) => {
          if (!settled) {
            settled = true
            cleanup()
            connectionPromiseRef.current = null
            const connectionError = new Error('NETWORK_UNAVAILABLE')
            connectionError.cause = error
            reject(connectionError)
          }
        }
        const timer = window.setTimeout(handleError, 6_000)

        socket.once('connect', handleConnect)
        socket.once('connect_error', handleError)
        setConnectionStatus('connecting')
        logSessionDiagnostic('socket:connecting')
        socket.connect()
      })

      connectionPromiseRef.current = connectionPromise
      return connectionPromise
    },
    [],
  )

  const performJoin = useCallback(
    (nextRole, nextSessionId, source) => {
      const socket = socketRef.current
      const clientId = getOrCreateClientId(nextRole)
      const requestKey = `${nextRole}:${nextSessionId}:${socket.id ?? 'pending'}`

      if (joinRequestRef.current?.key === requestKey) {
        logSessionDiagnostic('session:join-reused', {
          source,
          clientId,
          sessionCode: nextSessionId,
        })
        return joinRequestRef.current.promise
      }

      logSessionDiagnostic('session:join-send', {
        source,
        clientId,
        sessionCode: nextSessionId,
      })

      const request = emitWithAcknowledgement(
        SOCKET_EVENTS.sessionJoin,
        {
          sessionId: nextSessionId,
          payload: {
            role: nextRole,
            clientId,
          },
        },
      )
        .then((response) => {
          logSessionDiagnostic('session:join-accepted', {
            source,
            clientId,
            sessionCode: nextSessionId,
            sessionStatus: response.session?.status,
          })
          setIdentity(nextRole, nextSessionId)
          setRemoteSession(response.session)
          setSessionError(null)

          if (response.phoneUrl) {
            setPhoneUrl(response.phoneUrl)
          }
          if (response.qrCodeDataUrl) {
            setQrCodeDataUrl(response.qrCodeDataUrl)
          }
          if (response.qrMode || response.qrError) {
            setQrDiagnostics({
              phoneBaseUrl: response.phoneBaseUrl ?? null,
              qrUrl: response.qrUrl ?? response.phoneUrl ?? null,
              qrMode: response.qrMode ?? 'unconfigured',
              error: response.qrError ?? null,
            })
          }

          return response
        })
        .catch((error) => {
          logSessionDiagnostic('session:join-rejected', {
            source,
            clientId,
            sessionCode: nextSessionId,
            errorCode: error.code ?? 'NETWORK_ERROR',
          })
          throw error
        })

      joinRequestRef.current = {
        key: requestKey,
        promise: request,
      }
      request.then(
        () => {
          if (joinRequestRef.current?.promise === request) {
            joinRequestRef.current = null
          }
        },
        () => {
          if (joinRequestRef.current?.promise === request) {
            joinRequestRef.current = null
          }
        },
      )

      return request
    },
    [emitWithAcknowledgement, setIdentity],
  )

  const joinSession = useCallback(
    async (nextRole, nextSessionId) => {
      if (
        !Object.values(CLIENT_ROLES).includes(nextRole) ||
        !nextSessionId
      ) {
        throw new Error('INVALID_SESSION_IDENTITY')
      }

      setSessionError(null)
      manualConnectionRef.current = true

      try {
        await ensureConnected()
        const response = await performJoin(
          nextRole,
          nextSessionId,
          'bootstrap',
        )

        setConnectionStatus('connected')
        return response
      } finally {
        manualConnectionRef.current = false
      }
    },
    [ensureConnected, performJoin],
  )

  const createDisplaySession = useCallback(async () => {
    setSessionError(null)
    manualConnectionRef.current = true

    try {
      await ensureConnected()
      const response = await emitWithAcknowledgement(
        SOCKET_EVENTS.sessionCreate,
        {
          sessionId: null,
          payload: {
            role: CLIENT_ROLES.display,
            clientId: getOrCreateClientId(CLIENT_ROLES.display),
            publicPhoneBaseUrl: getPublicPhoneBaseUrl(),
          },
        },
      )

      setIdentity(CLIENT_ROLES.display, response.session.id)
      setRemoteSession(response.session)
      setPhoneUrl(response.phoneUrl)
      setQrCodeDataUrl(response.qrCodeDataUrl)
      setQrDiagnostics({
        phoneBaseUrl: response.phoneBaseUrl ?? null,
        qrUrl: response.qrUrl ?? response.phoneUrl ?? null,
        qrMode: response.qrMode ?? 'unconfigured',
        error: response.qrError ?? null,
      })

      if (response.qrError) {
        console.error(response.qrError)
      }

      setConnectionStatus('connected')
      return response
    } finally {
      manualConnectionRef.current = false
    }
  }, [emitWithAcknowledgement, ensureConnected, setIdentity])

  const sendSessionEvent = useCallback(
    async (eventName, payload = {}) => {
      const activeSessionId = identityRef.current.sessionId

      if (!activeSessionId) {
        throw new Error('SESSION_NOT_READY')
      }

      await ensureConnected()
      const response = await emitWithAcknowledgement(eventName, {
        sessionId: activeSessionId,
        payload,
      })

      if (response.session) {
        setRemoteSession(response.session)
      }

      return response
    },
    [emitWithAcknowledgement, ensureConnected],
  )

  const clearSession = useCallback(
    ({ clearExperience = false } = {}) => {
      identityRef.current = {
        role: null,
        sessionId: null,
      }
      clearClientSession({ clearExperience })
      setRole(null)
      setSessionId(null)
      setRemoteSession(null)
      setSessionError(null)
      setPhoneUrl(null)
      setQrCodeDataUrl(null)
      setQrDiagnostics({
        phoneBaseUrl: null,
        qrUrl: null,
        qrMode: 'unconfigured',
        error: null,
      })
    },
    [],
  )

  useEffect(() => {
    const socket = socketRef.current
    cancelScheduledSocketDisconnect()

    const handleConnect = async () => {
      setConnectionStatus('connected')
      const identity = identityRef.current
      logSessionDiagnostic('socket:connected', {
        socketId: socket.id,
        sessionCode: identity.sessionId,
      })

      if (
        manualConnectionRef.current ||
        !identity.role ||
        !identity.sessionId
      ) {
        return
      }

      try {
        await performJoin(
          identity.role,
          identity.sessionId,
          'socket-reconnect',
        )
      } catch (error) {
        setSessionError({
          code: error.code ?? 'RECONNECT_FAILED',
          message: error.message,
        })
      }
    }

    const handleDisconnect = (reason) => {
      setConnectionStatus('disconnected')
      logSessionDiagnostic('socket:disconnected', {
        reason,
        sessionCode: identityRef.current.sessionId,
      })
    }

    const handleSessionState = (envelope) => {
      if (
        envelope?.sessionId === identityRef.current.sessionId &&
        envelope.payload
      ) {
        setRemoteSession(envelope.payload)
        logSessionDiagnostic('session:state-received', {
          sessionCode: envelope.sessionId,
          sessionStatus: envelope.payload.status,
        })
      }
    }

    const handleSessionError = (envelope) => {
      if (
        !envelope?.sessionId ||
        envelope.sessionId === identityRef.current.sessionId
      ) {
        setSessionError(envelope.payload ?? {
          code: 'SESSION_ERROR',
        })
        logSessionDiagnostic('session:error-received', {
          sessionCode: envelope.sessionId,
          errorCode: envelope.payload?.code ?? 'SESSION_ERROR',
        })
      }
    }

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on(SOCKET_EVENTS.sessionState, handleSessionState)
    socket.on(SOCKET_EVENTS.sessionError, handleSessionError)

    return () => {
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off(SOCKET_EVENTS.sessionState, handleSessionState)
      socket.off(SOCKET_EVENTS.sessionError, handleSessionError)
      scheduleSocketDisconnect()
    }
  }, [performJoin])

  useEffect(() => {
    if (remoteSession?.status) {
      logSessionDiagnostic('session:status-changed', {
        sessionCode: remoteSession.id,
        sessionStatus: remoteSession.status,
      })
    }
  }, [remoteSession?.id, remoteSession?.status])

  const value = useMemo(
    () => ({
      clearSession,
      connectionStatus,
      createDisplaySession,
      joinSession,
      phoneUrl,
      qrCodeDataUrl,
      qrDiagnostics,
      remoteSession,
      role,
      sendSessionEvent,
      sessionError,
      sessionId,
    }),
    [
      clearSession,
      connectionStatus,
      createDisplaySession,
      joinSession,
      phoneUrl,
      qrCodeDataUrl,
      qrDiagnostics,
      remoteSession,
      role,
      sendSessionEvent,
      sessionError,
      sessionId,
    ],
  )

  return (
    <RealtimeSessionContext.Provider value={value}>
      {children}
    </RealtimeSessionContext.Provider>
  )
}

export { RealtimeSessionProvider }
