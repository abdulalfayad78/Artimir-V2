import AnimatedBackground from '../components/AnimatedBackground'
import HeightActuatorVisual from '../components/HeightActuatorVisual'
import HeightAdjustmentDebugPanel from '../components/HeightAdjustmentDebugPanel'
import HeightObservationPanel from '../components/HeightObservationPanel'
import KinophosLink from '../components/KinophosLink'
import PageTransition from '../components/PageTransition'
import ProgressIndicator from '../components/ProgressIndicator'
import useAutomaticHeightAdjustment from '../hooks/useAutomaticHeightAdjustment'
import useHeightController from '../hooks/useHeightController'
import useHeightObservation from '../hooks/useHeightObservation'
import useTranslation from '../i18n/useTranslation'

function debugHeightAdjustmentIsEnabled() {
  const hashQuery = window.location.hash.split('?')[1] ?? ''

  return (
    import.meta.env.DEV ||
    new URLSearchParams(window.location.search).get(
      'debugHeightAdjustment',
    ) === 'true' ||
    new URLSearchParams(hashQuery).get(
      'debugHeightAdjustment',
    ) === 'true'
  )
}

function HeightAdjustmentPage({ onComplete }) {
  const { t } = useTranslation()
  const {
    clearEmergencyStop,
    clearLocalError,
    emergencyStop,
    home,
    moveRelativeMm,
    moveToMm,
    refreshStatus,
    reset,
    simulateError,
    state,
    stop,
  } = useHeightController({ onComplete })
  const movementDirection = {
    moving_up: 'up',
    moving_down: 'down',
  }[state.status] ?? 'none'
  const debugEnabled = debugHeightAdjustmentIsEnabled()
  const isComplete = state.status === 'complete'
  const isLocalService = state.mode === 'localService'
  const heightObservation = useHeightObservation({
    enabled: isLocalService,
  })
  const automaticHeightAdjustment = useAutomaticHeightAdjustment({
    controllerState: state,
    moveToMm,
    observation: heightObservation.observation,
    stop,
  })
  const shouldShowDirection = ['moving_up', 'moving_down'].includes(
    state.status,
  )
  const handleStop = () => {
    if (automaticHeightAdjustment.isMovingAutomatically) {
      automaticHeightAdjustment.stopAutomation()
      return
    }

    stop()
  }

  return (
    <PageTransition className="experience-page height-adjustment-page">
      <AnimatedBackground />

      <header className="height-adjustment-page__header">
        <KinophosLink />
        <div
          className="language-page__wordmark"
          aria-label={t('common.artimir')}
        >
          <span aria-hidden="true">A</span>
          {t('common.artimir')}
        </div>
        <ProgressIndicator current={5} total={10} />
      </header>

      <main className="height-adjustment-page__content">
        <div className="height-adjustment-page__heading">
          <p className="section-kicker">
            <span aria-hidden="true" />
            {t('heightAdjustment.step')}
          </p>
          <h1>{t('heightAdjustment.title')}</h1>
          <p>{t('heightAdjustment.description')}</p>
        </div>

        <div className="height-adjustment-page__workspace">
          <HeightActuatorVisual
            state={state}
            showTechnicalDetails={debugEnabled}
          />

          <section
            className={`height-status height-status--${state.status}`}
            aria-live="polite"
          >
            <p>{t('heightAdjustment.currentStatus')}</p>
            <h2>
              {t(`heightAdjustment.status.${state.status}`)}
            </h2>
            {debugEnabled && (
              <dl>
                <div>
                  <dt>{t('heightAdjustment.currentPosition')}</dt>
                  <dd>
                    {Number.isFinite(state.currentPositionMm)
                      ? `${Math.round(state.currentPositionMm)} mm`
                      : t('heightAdjustment.notAvailable')}
                  </dd>
                </div>
                <div>
                  <dt>{t('heightAdjustment.targetPosition')}</dt>
                  <dd>
                    {Number.isFinite(state.targetPositionMm)
                      ? `${Math.round(state.targetPositionMm)} mm`
                      : t('heightAdjustment.notAvailable')}
                  </dd>
                </div>
                <div>
                  <dt>{t('heightAdjustment.mode')}</dt>
                  <dd>
                    {t(`heightAdjustment.modeValue.${state.mode}`)}
                  </dd>
                </div>
              </dl>
            )}

            {shouldShowDirection && (
              <p className="height-status__direction">
                {t('heightAdjustment.direction')} —{' '}
                {t(
                  `heightAdjustment.directionValue.${movementDirection}`,
                )}
              </p>
            )}

            {isLocalService && !state.positionKnown && (
              <p className="height-status__reference">
                {t('heightAdjustment.referenceRequired')}
              </p>
            )}

            <div
              className="height-status__safety"
              role={state.error ? 'alert' : 'status'}
            >
              <span aria-hidden="true">!</span>
              <p>
                {state.error
                  ? t(`heightAdjustment.errors.${state.error}`)
                  : t('heightAdjustment.safety')}
              </p>
            </div>

            {isComplete ? (
              <div className="height-status__confirmation" role="status">
                <span aria-hidden="true">✓</span>
                <p>{t('heightAdjustment.completeMessage')}</p>
              </div>
            ) : (
              <button
                className="height-stop-button"
                type="button"
                onClick={handleStop}
                disabled={state.status === 'emergency_stop'}
              >
                {t('heightAdjustment.actions.stop')}
              </button>
            )}
          </section>
        </div>

        {isLocalService && (
          <HeightObservationPanel
            cameraStatus={heightObservation.cameraStatus}
            detectionError={heightObservation.detectionError}
            detectionStatus={heightObservation.detectionStatus}
            errorCode={heightObservation.errorCode}
            observation={heightObservation.observation}
            automaticAdjustment={automaticHeightAdjustment}
            showDebug={debugEnabled}
            videoRef={heightObservation.videoRef}
          />
        )}

        {debugEnabled && (
          <HeightAdjustmentDebugPanel
            onClearEmergencyStop={clearEmergencyStop}
            onClearLocalError={clearLocalError}
            onEmergencyStop={emergencyStop}
            onHome={home}
            onMoveRelative={moveRelativeMm}
            onMoveTo={moveToMm}
            onRefreshStatus={refreshStatus}
            onReset={reset}
            onSimulateError={() =>
              simulateError('SIMULATED_ERROR')
            }
            onStop={handleStop}
            automaticAdjustment={automaticHeightAdjustment}
            observation={heightObservation.observation}
            state={state}
          />
        )}
      </main>
    </PageTransition>
  )
}

export default HeightAdjustmentPage
