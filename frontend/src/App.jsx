import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import {
  CLIENT_ROLES,
  SESSION_STATUSES,
  SOCKET_EVENTS,
} from '../../shared/sessionProtocol.js'
import { ExperienceProvider } from './context/ExperienceContext.jsx'
import useExperience from './context/useExperience'
import useRealtimeSession from './context/useRealtimeSession'
import useDisplaySessionController from './hooks/useDisplaySessionController'
import useTranslation from './i18n/useTranslation'
import {
  getSessionIdFromLocation,
  navigateHash,
  readHashLocation,
  routes,
} from './navigation/hashNavigation'
import CustomizationPage from './pages/CustomizationPage'
import ArtworkSelectionPlaceholderPage from './pages/ArtworkSelectionPlaceholderPage'
import DisplayPlaceholderPage from './pages/DisplayPlaceholderPage'
import DisplayWaitingPage from './pages/DisplayWaitingPage'
import HeightAdjustmentPage from './pages/HeightAdjustmentPage'
import LanguagePage from './pages/LanguagePage'
import LookAtArtimirPage from './pages/LookAtArtimirPage'
import ProfilePage from './pages/ProfilePage'
import SessionMessagePage from './pages/SessionMessagePage'
import { logSessionDiagnostic } from './realtime/sessionDiagnostics'
import { canUseDisplayCamera } from './security/cameraAccess'

const PositioningPage = lazy(() => import('./pages/PositioningPage'))

function DisplayPositioningRoute() {
  const {
    remoteSession,
    role,
    sendSessionEvent,
    sessionId,
  } = useRealtimeSession()
  const startedRef = useRef(false)
  const completionSentRef = useRef(false)
  const completionPromiseRef = useRef(null)
  const location = readHashLocation()

  const cameraAuthorized = canUseDisplayCamera({
    remoteSession,
    role,
    routePath: location.path,
    sessionId,
  })
  const canStartPositioning =
    role === CLIENT_ROLES.display &&
    location.path === routes.displayPositioning &&
    remoteSession?.id === sessionId &&
    remoteSession?.status === SESSION_STATUSES.startPositioning

  useEffect(() => {
    if (!canStartPositioning || startedRef.current) {
      return
    }

    startedRef.current = true
    sendSessionEvent(
      SOCKET_EVENTS.displayPositioningStarted,
    ).catch(() => {
      startedRef.current = false
    })
  }, [canStartPositioning, sendSessionEvent])

  const handleComplete = useCallback(
    () => {
      if (completionSentRef.current) {
        return completionPromiseRef.current ?? Promise.resolve()
      }

      completionSentRef.current = true
      completionPromiseRef.current = sendSessionEvent(
        SOCKET_EVENTS.displayPositioningCompleted,
      ).catch((error) => {
        completionSentRef.current = false
        completionPromiseRef.current = null
        throw error
      })

      return completionPromiseRef.current
    },
    [sendSessionEvent],
  )

  if (!cameraAuthorized && canStartPositioning) {
    return (
      <SessionMessagePage
        titleKey="sync.connectingTitle"
        messageKey="sync.connectingMessage"
      />
    )
  }

  if (!cameraAuthorized) {
    return (
      <SessionMessagePage
        titleKey="sync.unauthorizedTitle"
        messageKey="sync.unauthorizedCamera"
      />
    )
  }

  return (
    <Suspense
      fallback={
        <SessionMessagePage
          titleKey="sync.connectingTitle"
          messageKey="sync.connectingMessage"
        />
      }
    >
      <PositioningPage
        cameraAuthorized={cameraAuthorized}
        currentRoute={location.path}
        currentSessionState={remoteSession?.status ?? null}
        onComplete={handleComplete}
      />
    </Suspense>
  )
}

function DisplayHeightRoute() {
  const { remoteSession, sendSessionEvent } = useRealtimeSession()
  const notifiedRef = useRef(false)

  useEffect(() => {
    if (
      remoteSession?.status !==
        SESSION_STATUSES.positioningCompleted ||
      notifiedRef.current
    ) {
      return
    }

    notifiedRef.current = true
    sendSessionEvent(
      SOCKET_EVENTS.displayHeightAdjustmentStarted,
    ).catch(() => {
      notifiedRef.current = false
    })
  }, [remoteSession?.status, sendSessionEvent])

  const handleComplete = useCallback(
    () =>
      sendSessionEvent(
        SOCKET_EVENTS.displayExperienceStarted,
      ),
    [sendSessionEvent],
  )

  return <HeightAdjustmentPage onComplete={handleComplete} />
}

function ExperienceRouter() {
  const {
    clearSession,
    joinSession,
    qrCodeDataUrl,
    qrDiagnostics,
    remoteSession,
    role,
    sendSessionEvent,
    sessionError,
    sessionId,
  } = useRealtimeSession()
  const {
    hydrateSession,
    resetExperience,
    session,
  } = useExperience()
  const { t, language, direction } = useTranslation()
  const [location, setLocation] = useState(readHashLocation)
  const [phoneBootstrap, setPhoneBootstrap] = useState('idle')
  const [phoneJoinRetry, setPhoneJoinRetry] = useState(0)
  const phoneJoinPromiseRef = useRef(null)
  const initialPhoneSessionIdRef = useRef(undefined)
  const isDisplayRoute = location.path.startsWith('/display')
  const isPhoneRoute = location.path.startsWith('/phone')
  const displayController = useDisplaySessionController(
    isDisplayRoute,
  )

  useEffect(() => {
    const syncLocation = () => {
      const nextLocation = readHashLocation()
      logSessionDiagnostic('route:changed', {
        route: nextLocation.path,
      })
      setLocation(nextLocation)
    }

    logSessionDiagnostic('route:initial', {
      route: readHashLocation().path,
    })
    window.addEventListener('hashchange', syncLocation)
    return () => window.removeEventListener('hashchange', syncLocation)
  }, [])

  useEffect(() => {
    document.documentElement.lang = language
    document.documentElement.dir = direction
    document.title = t('meta.title')
  }, [direction, language, t])

  useEffect(() => {
    if (!isDisplayRoute || !remoteSession) {
      return
    }

    if (
      remoteSession.language &&
      session.language !== remoteSession.language
    ) {
      hydrateSession({
        language: remoteSession.language,
        ageRange: remoteSession.profile?.ageRange ?? null,
        artFamiliarity:
          remoteSession.profile?.artFamiliarity ?? null,
        customization: remoteSession.customization,
      })
      return
    }

    if (
      remoteSession.status ===
        SESSION_STATUSES.waitingForPhone &&
      (session.language ||
        session.ageRange ||
        session.artFamiliarity ||
        session.customization)
    ) {
      resetExperience()
    }
  }, [
    hydrateSession,
    isDisplayRoute,
    remoteSession,
    resetExperience,
    session,
  ])

  if (
    initialPhoneSessionIdRef.current === undefined &&
    isPhoneRoute
  ) {
    initialPhoneSessionIdRef.current =
      getSessionIdFromLocation() ||
      (role === CLIENT_ROLES.phone ? sessionId : null)
  }

  const requestedPhoneSessionId = isPhoneRoute
    ? initialPhoneSessionIdRef.current
    : null

  useEffect(() => {
    if (!isPhoneRoute) {
      setPhoneBootstrap('idle')
      return
    }

    if (!requestedPhoneSessionId) {
      setPhoneBootstrap('missing')
      return
    }

    if (
      role === CLIENT_ROLES.phone &&
      remoteSession?.id === requestedPhoneSessionId
    ) {
      hydrateSession({
        language: remoteSession.language,
        ageRange: remoteSession.profile?.ageRange ?? null,
        artFamiliarity:
          remoteSession.profile?.artFamiliarity ?? null,
        customization: remoteSession.customization,
      })
      setPhoneBootstrap('ready')
      return
    }

    let active = true
    setPhoneBootstrap('loading')
    logSessionDiagnostic('phone-bootstrap:start', {
      sessionCode: requestedPhoneSessionId,
      retry: phoneJoinRetry,
    })

    let joinAttempt = phoneJoinPromiseRef.current

    if (
      !joinAttempt ||
      joinAttempt.sessionId !== requestedPhoneSessionId
    ) {
      const promise = joinSession(
        CLIENT_ROLES.phone,
        requestedPhoneSessionId,
      )
      joinAttempt = {
        promise,
        sessionId: requestedPhoneSessionId,
      }
      phoneJoinPromiseRef.current = joinAttempt
      promise.then(
        () => {
          if (phoneJoinPromiseRef.current?.promise === promise) {
            phoneJoinPromiseRef.current = null
          }
        },
        () => {
          if (phoneJoinPromiseRef.current?.promise === promise) {
            phoneJoinPromiseRef.current = null
          }
        },
      )
    }

    joinAttempt.promise
      .then((response) => {
        if (!active) {
          return
        }

        const serverSession = response.session
        hydrateSession({
          language: serverSession.language,
          ageRange: serverSession.profile?.ageRange ?? null,
          artFamiliarity:
            serverSession.profile?.artFamiliarity ?? null,
          customization: serverSession.customization,
        })
        setPhoneBootstrap('ready')
        logSessionDiagnostic('phone-bootstrap:ready', {
          sessionCode: requestedPhoneSessionId,
          sessionStatus: serverSession.status,
        })
      })
      .catch((error) => {
        if (!active) {
          return
        }

        const definitiveStatus = {
          SESSION_ALREADY_USED: 'already-used',
          SESSION_NOT_FOUND: 'invalid',
          SESSION_EXPIRED: 'expired',
        }[error.code]
        setPhoneBootstrap(definitiveStatus ?? 'network-error')
        logSessionDiagnostic('phone-bootstrap:failed', {
          sessionCode: requestedPhoneSessionId,
          errorCode: error.code ?? 'NETWORK_ERROR',
        })
      })

    return () => {
      active = false
    }
  }, [
    hydrateSession,
    isPhoneRoute,
    joinSession,
    phoneJoinRetry,
    remoteSession,
    requestedPhoneSessionId,
    role,
  ])

  const hasValidatedPhoneSession =
    role === CLIENT_ROLES.phone &&
    remoteSession?.id === requestedPhoneSessionId

  useEffect(() => {
    if (
      !isPhoneRoute ||
      phoneBootstrap !== 'ready' ||
      !requestedPhoneSessionId
    ) {
      return
    }

    if (
      location.path === routes.phoneProfile &&
      !session.language
    ) {
      navigateHash(routes.phoneLanguages, {
        sessionId: requestedPhoneSessionId,
        replace: true,
      })
      return
    }

    if (
      location.path === routes.phoneCustomization &&
      (!session.ageRange || !session.artFamiliarity)
    ) {
      navigateHash(routes.phoneProfile, {
        sessionId: requestedPhoneSessionId,
        replace: true,
      })
      return
    }

    if (
      !Object.values(routes).includes(location.path) ||
      !location.path.startsWith('/phone')
    ) {
      navigateHash(routes.phoneLanguages, {
        sessionId: requestedPhoneSessionId,
        replace: true,
      })
    }
  }, [
    isPhoneRoute,
    location.path,
    phoneBootstrap,
    requestedPhoneSessionId,
    session.ageRange,
    session.artFamiliarity,
    session.language,
  ])

  useEffect(() => {
    if (!isPhoneRoute || !remoteSession) {
      return
    }

    if (remoteSession.status === SESSION_STATUSES.sessionExpired) {
      navigateHash(routes.phoneSessionExpired, {
        sessionId: remoteSession.id,
        replace: true,
      })
      return
    }

    if (remoteSession.status === SESSION_STATUSES.sessionCompleted) {
      navigateHash(routes.phoneSessionComplete, {
        sessionId: remoteSession.id,
        replace: true,
      })
      return
    }

    if (
      [
        SESSION_STATUSES.startPositioning,
        SESSION_STATUSES.positioningActive,
        SESSION_STATUSES.positioningCompleted,
        SESSION_STATUSES.heightAdjustment,
        SESSION_STATUSES.experienceActive,
        SESSION_STATUSES.generating,
        SESSION_STATUSES.resultReady,
      ].includes(remoteSession.status) &&
      location.path !== routes.phoneLookAtArtimir
    ) {
      navigateHash(routes.phoneLookAtArtimir, {
        sessionId: remoteSession.id,
        replace: true,
      })
    }
  }, [isPhoneRoute, location.path, remoteSession])

  useEffect(() => {
    if (location.path !== routes.legacyPositioning) {
      return
    }

    if (role === CLIENT_ROLES.phone && sessionId) {
      navigateHash(routes.phoneLookAtArtimir, {
        sessionId,
        replace: true,
      })
    }
  }, [location.path, role, sessionId])

  useEffect(() => {
    if (
      isDisplayRoute ||
      isPhoneRoute ||
      location.path === routes.legacyPositioning
    ) {
      return
    }

    clearSession()
    navigateHash(routes.displayRoot, { replace: true })
  }, [
    clearSession,
    isDisplayRoute,
    isPhoneRoute,
    location.path,
  ])

  const phoneNavigate = useCallback(
    (path, options = {}) =>
      navigateHash(path, {
        sessionId: requestedPhoneSessionId ?? sessionId,
        ...options,
      }),
    [requestedPhoneSessionId, sessionId],
  )

  const notifyProfile = useCallback(
    (profile) =>
      sendSessionEvent(SOCKET_EVENTS.phoneProfileUpdated, {
        profile,
      }),
    [sendSessionEvent],
  )

  const notifyCustomization = useCallback(
    (customization) =>
      sendSessionEvent(
        SOCKET_EVENTS.phoneCustomizationUpdated,
        { customization },
      ),
    [sendSessionEvent],
  )

  const cancelPhoneSession = useCallback(async () => {
    try {
      await sendSessionEvent(SOCKET_EVENTS.phoneCancel)
    } finally {
      resetExperience()
      phoneNavigate(routes.phoneSessionComplete, {
        replace: true,
      })
    }
  }, [phoneNavigate, resetExperience, sendSessionEvent])

  let page

  if (location.path === routes.legacyPositioning) {
    page = (
      <SessionMessagePage
        titleKey="sync.unauthorizedTitle"
        messageKey="sync.legacyCameraRoute"
      />
    )
  } else if (isDisplayRoute) {
    switch (location.path) {
      case routes.displayPositioning:
        page = <DisplayPositioningRoute />
        break
      case routes.displayHeightAdjustment:
        page = <DisplayHeightRoute />
        break
      case routes.displayArtworkSelection:
        page = (
          <ArtworkSelectionPlaceholderPage
            onBack={() =>
              navigateHash(routes.displayHeightAdjustment, {
                sessionId,
              })
            }
          />
        )
        break
      case routes.displayExperience:
        page = (
          <DisplayPlaceholderPage
            titleKey="displayPlaceholder.experienceTitle"
            descriptionKey="displayPlaceholder.experienceDescription"
          />
        )
        break
      case routes.displayResult:
        page = (
          <DisplayPlaceholderPage
            titleKey="displayPlaceholder.resultTitle"
            descriptionKey="displayPlaceholder.resultDescription"
          />
        )
        break
      case routes.displayRoot:
      case routes.displayWaiting:
      default:
        page = (
          <DisplayWaitingPage
            bootstrapStatus={displayController.bootstrapStatus}
            qrCodeDataUrl={qrCodeDataUrl}
            qrDiagnostics={qrDiagnostics}
            session={remoteSession}
            sessionError={
              sessionError ?? displayController.sessionError
            }
          />
        )
    }
  } else if (isPhoneRoute) {
    if (
      phoneBootstrap === 'loading' &&
      !hasValidatedPhoneSession
    ) {
      page = (
        <SessionMessagePage
          titleKey="sync.connectingTitle"
          messageKey="sync.connectingMessage"
        />
      )
    } else if (
      phoneBootstrap === 'already-used' ||
      sessionError?.code === 'SESSION_ALREADY_USED'
    ) {
      page = (
        <SessionMessagePage
          titleKey="sync.alreadyUsedTitle"
          messageKey="sync.alreadyUsedMessage"
        />
      )
    } else if (
      ['missing', 'invalid', 'expired'].includes(phoneBootstrap) ||
      ['SESSION_NOT_FOUND', 'SESSION_EXPIRED'].includes(
        sessionError?.code,
      )
    ) {
      page = (
        <SessionMessagePage
          titleKey="sync.invalidSessionTitle"
          messageKey="sync.invalidSessionMessage"
          onAction={() => window.location.reload()}
        />
      )
    } else if (phoneBootstrap === 'network-error') {
      page = (
        <SessionMessagePage
          titleKey="sync.connectingTitle"
          messageKey="sync.networkError"
          onAction={() => {
            phoneJoinPromiseRef.current = null
            setPhoneJoinRetry((current) => current + 1)
          }}
        />
      )
    } else {
      switch (location.path) {
        case routes.phoneLanguages:
          page = (
            <LanguagePage
              onLanguageSelected={(nextLanguage) =>
                sendSessionEvent(
                  SOCKET_EVENTS.phoneLanguageSelected,
                  { language: nextLanguage },
                )
              }
              onComplete={() =>
                phoneNavigate(routes.phoneProfile)
              }
            />
          )
          break
        case routes.phoneProfile:
          if (!session.language) {
            page = (
              <SessionMessagePage
                titleKey="sync.connectingTitle"
                messageKey="sync.connectingMessage"
              />
            )
          } else {
            page = (
              <ProfilePage
                onBack={() =>
                  phoneNavigate(routes.phoneLanguages)
                }
                onContinue={async (profile) => {
                  await notifyProfile(
                    profile ?? {
                      ageRange: session.ageRange,
                      artFamiliarity: session.artFamiliarity,
                    },
                  )
                  phoneNavigate(routes.phoneCustomization)
                }}
              />
            )
          }
          break
        case routes.phoneCustomization:
          if (!session.ageRange || !session.artFamiliarity) {
            page = (
              <SessionMessagePage
                titleKey="sync.connectingTitle"
                messageKey="sync.connectingMessage"
              />
            )
          } else {
            page = (
              <CustomizationPage
                onBack={() =>
                  phoneNavigate(routes.phoneProfile)
                }
                onCancel={cancelPhoneSession}
                onCustomizationStarted={() => {
                  notifyCustomization(
                    session.customization,
                  ).catch(() => {})
                }}
                onCustomizationChanged={(customization) => {
                  notifyCustomization(customization).catch(() => {})
                }}
                onContinue={async () => {
                  await sendSessionEvent(
                    SOCKET_EVENTS.phoneStartPositioning,
                    {
                      language: session.language,
                      profile: {
                        ageRange: session.ageRange,
                        artFamiliarity:
                          session.artFamiliarity,
                      },
                      customization: session.customization,
                    },
                  )
                  phoneNavigate(routes.phoneLookAtArtimir)
                }}
              />
            )
          }
          break
        case routes.phoneLookAtArtimir:
          page = (
            <LookAtArtimirPage
              onCancel={cancelPhoneSession}
              session={remoteSession}
            />
          )
          break
        case routes.phoneSessionExpired:
          page = (
            <SessionMessagePage
              titleKey="sync.expiredTitle"
              messageKey="sync.expiredMessage"
            />
          )
          break
        case routes.phoneSessionComplete:
          page = (
            <SessionMessagePage
              titleKey="sync.completeTitle"
              messageKey="sync.completeMessage"
            />
          )
          break
        default:
          page = (
            <SessionMessagePage
              titleKey="sync.connectingTitle"
              messageKey="sync.connectingMessage"
            />
          )
      }
    }
  } else {
    page = (
      <SessionMessagePage
        titleKey="sync.connectingTitle"
        messageKey="sync.connectingMessage"
      />
    )
  }

  return (
    <div className="app" lang={language} dir={direction}>
      {page}
    </div>
  )
}

function App() {
  return (
    <ExperienceProvider>
      <ExperienceRouter />
    </ExperienceProvider>
  )
}

export default App
