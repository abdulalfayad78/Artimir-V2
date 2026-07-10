import { useEffect, useRef, useState } from 'react'
import {
  CLIENT_ROLES,
  SESSION_STATUSES,
} from '../../../shared/sessionProtocol.js'
import useRealtimeSession from '../context/useRealtimeSession'
import { getDisplayRouteForSessionStatus } from '../navigation/displaySessionRoutes.js'
import {
  navigateHash,
  routes,
} from '../navigation/hashNavigation'

function useDisplaySessionController(enabled) {
  const {
    clearSession,
    createDisplaySession,
    joinSession,
    remoteSession,
    role,
    sessionError,
    sessionId,
  } = useRealtimeSession()
  const [bootstrapStatus, setBootstrapStatus] = useState('idle')
  const attemptRef = useRef(null)
  const lastNavigationRef = useRef(null)

  useEffect(() => {
    if (!enabled || attemptRef.current) {
      return
    }

    let cancelled = false
    const attemptKey = `${role ?? 'none'}:${sessionId ?? 'new'}`
    attemptRef.current = attemptKey
    setBootstrapStatus('loading')

    const bootstrap = async () => {
      try {
        if (role === CLIENT_ROLES.display && sessionId) {
          try {
            await joinSession(CLIENT_ROLES.display, sessionId)
          } catch {
            clearSession()
            await createDisplaySession()
          }
        } else {
          clearSession()
          await createDisplaySession()
        }

        if (!cancelled) {
          setBootstrapStatus('ready')
        }
      } catch {
        if (!cancelled) {
          setBootstrapStatus('error')
          attemptRef.current = null
        }
      }
    }

    bootstrap()

    return () => {
      cancelled = true
      if (attemptRef.current === attemptKey) {
        attemptRef.current = null
      }
    }
  }, [
    clearSession,
    createDisplaySession,
    enabled,
    joinSession,
    role,
    sessionId,
  ])

  useEffect(() => {
    if (!enabled || !remoteSession) {
      return
    }

    if (
      remoteSession.status === SESSION_STATUSES.sessionCompleted ||
      remoteSession.status === SESSION_STATUSES.sessionExpired
    ) {
      clearSession({ clearExperience: true })
      attemptRef.current = null
      lastNavigationRef.current = null
      navigateHash(routes.displayRoot, { replace: true })
      return
    }

    const nextRoute = getDisplayRouteForSessionStatus(
      remoteSession.status,
    )

    if (!nextRoute || lastNavigationRef.current === nextRoute) {
      return
    }

    lastNavigationRef.current = nextRoute
    navigateHash(nextRoute, {
      sessionId: remoteSession.id,
    })
  }, [clearSession, enabled, remoteSession])

  return {
    bootstrapStatus,
    sessionError,
  }
}

export default useDisplaySessionController
