import { useEffect, useRef, useState } from 'react'
import AnimatedBackground from '../components/AnimatedBackground'
import CameraSelector from '../components/CameraSelector'
import PageTransition from '../components/PageTransition'
import PositioningCameraStage from '../components/PositioningCameraStage'
import PositioningCriteria from '../components/PositioningCriteria'
import PositioningDemoControls from '../components/PositioningDemoControls'
import PositioningDiagnostics from '../components/PositioningDiagnostics'
import ProgressIndicator from '../components/ProgressIndicator'
import usePositionDetection, {
  sourceModes,
} from '../hooks/usePositionDetection'
import positioningConfig from '../config/positioningConfig'
import useTranslation from '../i18n/useTranslation'
import {
  createInitialPositioningCompletionState,
  createPositioningCompletionController,
} from '../positioning/createPositioningCompletionController'

function debugPositioningIsEnabled() {
  const hashQuery = window.location.hash.split('?')[1] ?? ''

  return (
    import.meta.env.DEV &&
    (new URLSearchParams(window.location.search).get(
      'debugPositioning',
    ) === 'true' ||
      new URLSearchParams(hashQuery).get('debugPositioning') ===
        'true')
  )
}

function PositioningPage({
  cameraAuthorized = false,
  currentRoute = null,
  currentSessionState = null,
  onBack,
  onComplete,
}) {
  const { t, isRtl } = useTranslation()
  const debugPositioningEnabled = debugPositioningIsEnabled()
  const {
    activateCameraMode,
    activateDemoMode,
    availableCameras,
    cameraStatus,
    criteria,
    detectionError,
    detectionStatus,
    errorCode,
    faceOverlays,
    globalState,
    performanceInfo,
    positionState,
    retryCamera,
    selectCamera,
    selectedDeviceId,
    setDemoPositionState,
    shutdown,
    sourceMode,
    stabilityProgress,
    trackingBox,
    videoRef,
  } = usePositionDetection({ enabled: cameraAuthorized })
  const completionControllerRef = useRef(null)
  const [completionState, setCompletionState] = useState(
    createInitialPositioningCompletionState,
  )
  const onCompleteRef = useRef(onComplete)

  onCompleteRef.current = onComplete

  useEffect(() => {
    const controller = createPositioningCompletionController({
      onComplete: () => onCompleteRef.current?.(),
      onStateChange: setCompletionState,
      shutdown,
    })
    completionControllerRef.current = controller

    return () => {
      controller.destroy()
      if (completionControllerRef.current === controller) {
        completionControllerRef.current = null
      }
    }
  }, [shutdown])

  useEffect(() => {
    completionControllerRef.current?.evaluate(globalState)
  }, [globalState])

  const handleBack = () => {
    shutdown()
    onBack?.()
  }

  return (
    <PageTransition className="experience-page positioning-page">
      <AnimatedBackground />

      <header className="positioning-page__header">
        {onBack ? (
          <button className="back-button" type="button" onClick={handleBack}>
            <span aria-hidden="true">{isRtl ? '→' : '←'}</span>
            <span>{t('common.back')}</span>
          </button>
        ) : (
          <span aria-hidden="true" />
        )}

        <div
          className="language-page__wordmark"
          aria-label={t('common.artimir')}
        >
          <span aria-hidden="true">A</span>
          {t('common.artimir')}
        </div>

        <ProgressIndicator current={4} total={10} />
      </header>

      <main className="positioning-page__content">
        <div className="positioning-page__heading">
          <p className="section-kicker">
            <span aria-hidden="true" />
            {t('positioning.step')}
          </p>
          <h1>{t('positioning.title')}</h1>
          <p>{t('positioning.description')}</p>
        </div>

        <div className="positioning-page__workspace">
          <PositioningCameraStage
            cameraStatus={cameraStatus}
            detectionError={detectionError}
            detectionStatus={detectionStatus}
            errorCode={errorCode}
            onBack={handleBack}
            onRetry={retryCamera}
            primaryInstruction={positionState}
            positioningRoi={positioningConfig.positioningRoi}
            diagnosticFaces={faceOverlays}
            showDiagnosticOverlays={debugPositioningEnabled}
            sourceMode={sourceMode}
            stabilityProgress={stabilityProgress}
            trackingBox={trackingBox}
            validationLabel={
              positioningConfig.cameraMode === 'single'
                ? t('positioning.validation.single')
                : t('positioning.validation.multi')
            }
            videoRef={videoRef}
          />
          <PositioningCriteria criteria={criteria} />
        </div>

        {debugPositioningEnabled &&
          sourceMode === sourceModes.camera && (
            <>
              <section className="positioning-debug">
                <div>
                  <p>{t('positioning.debug.kicker')}</p>
                  <strong>{t('positioning.debug.title')}</strong>
                </div>
                <CameraSelector
                  cameras={availableCameras}
                  onChange={selectCamera}
                  selectedDeviceId={selectedDeviceId}
                />
                <button type="button" onClick={activateDemoMode}>
                  {t('positioning.actions.useDemo')}
                </button>
              </section>
              <PositioningDiagnostics
                completionState={completionState}
                currentRoute={currentRoute}
                currentSessionState={currentSessionState}
                globalState={globalState}
                performanceInfo={performanceInfo}
              />
            </>
          )}

        {debugPositioningEnabled &&
          sourceMode === sourceModes.demo && (
          <PositioningDemoControls
            onChange={setDemoPositionState}
            onUseCamera={activateCameraMode}
            value={positionState}
          />
          )}
      </main>
    </PageTransition>
  )
}

export default PositioningPage
