import { useEffect, useRef, useState } from 'react'
import { cameraStates } from '../hooks/useCameraStream'
import {
  detectionStates,
  sourceModes,
} from '../hooks/usePositionDetection'
import useTranslation from '../i18n/useTranslation'

function getCoverTrackingStyle(trackingBox, video, viewport) {
  if (
    !trackingBox ||
    !video?.videoWidth ||
    !video?.videoHeight ||
    !viewport
  ) {
    return undefined
  }

  const viewportWidth = viewport.clientWidth
  const viewportHeight = viewport.clientHeight
  const scale = Math.max(
    viewportWidth / video.videoWidth,
    viewportHeight / video.videoHeight,
  )
  const renderedWidth = video.videoWidth * scale
  const renderedHeight = video.videoHeight * scale
  const offsetX = (viewportWidth - renderedWidth) / 2
  const offsetY = (viewportHeight - renderedHeight) / 2

  return {
    left: `${offsetX + trackingBox.x * renderedWidth}px`,
    top: `${offsetY + trackingBox.y * renderedHeight}px`,
    width: `${trackingBox.width * renderedWidth}px`,
    height: `${trackingBox.height * renderedHeight}px`,
  }
}

function PositioningCameraStage({
  cameraStatus,
  detectionError,
  detectionStatus,
  errorCode,
  onBack,
  onRetry,
  primaryInstruction,
  positioningRoi,
  diagnosticFaces = [],
  showDiagnosticOverlays = false,
  sourceMode,
  stabilityProgress,
  trackingBox,
  validationLabel,
  videoRef,
}) {
  const { t } = useTranslation()
  const viewportRef = useRef(null)
  const [layoutVersion, setLayoutVersion] = useState(0)
  const isDemo = sourceMode === sourceModes.demo
  const hasCameraError =
    sourceMode === sourceModes.camera &&
    cameraStatus === cameraStates.error
  const isComplete = primaryInstruction === 'position_correct'
  const trackingStyle = getCoverTrackingStyle(
    trackingBox,
    videoRef.current,
    viewportRef.current,
    layoutVersion,
  )
  const roiStyle = getCoverTrackingStyle(
    {
      x: positioningRoi.left,
      y: positioningRoi.top,
      width: positioningRoi.right - positioningRoi.left,
      height: positioningRoi.bottom - positioningRoi.top,
    },
    videoRef.current,
    viewportRef.current,
    layoutVersion,
  )

  useEffect(() => {
    const viewport = viewportRef.current

    if (!viewport || !window.ResizeObserver) {
      return undefined
    }

    const resizeObserver = new ResizeObserver(() => {
      setLayoutVersion((currentVersion) => currentVersion + 1)
    })

    resizeObserver.observe(viewport)

    return () => resizeObserver.disconnect()
  }, [])

  return (
    <section
      className={`positioning-stage positioning-stage--${sourceMode}${
        isComplete ? ' positioning-stage--complete' : ''
      }`}
      aria-label={t('positioning.camera.stageLabel')}
    >
      <div className="positioning-stage__viewport" ref={viewportRef}>
        <video
          className="positioning-stage__video"
          ref={videoRef}
          autoPlay
          muted
          playsInline
          onLoadedMetadata={() =>
            setLayoutVersion((currentVersion) => currentVersion + 1)
          }
          aria-label={t('positioning.camera.previewLabel')}
        />

        {isDemo && (
          <div className="positioning-stage__demo-visual" aria-hidden="true">
            <span />
            <span />
          </div>
        )}

        <div className="positioning-stage__shade" aria-hidden="true" />
        <div className="positioning-stage__grid" aria-hidden="true" />
        <div className="positioning-stage__frame" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="positioning-stage__reticle" aria-hidden="true" />
        <div
          className="positioning-stage__roi"
          style={roiStyle}
          aria-hidden="true"
        />

        <div
          className={`face-tracking-box${
            trackingStyle ? ' face-tracking-box--visible' : ''
          }`}
          style={trackingStyle}
          aria-hidden="true"
        >
          <span />
          <span />
          <span />
          <span />
        </div>

        {showDiagnosticOverlays &&
          diagnosticFaces.map((face) => (
            <div
              className={`positioning-face-debug positioning-face-debug--${face.classification}`}
              style={getCoverTrackingStyle(
                face.trackingBox,
                videoRef.current,
                viewportRef.current,
                layoutVersion,
              )}
              key={face.sourceIndex}
              aria-hidden="true"
            >
              {face.sourceIndex + 1}
            </div>
          ))}

        <div className="positioning-stage__topline">
          <span
            className={`positioning-mode-badge positioning-mode-badge--${sourceMode}`}
          >
            <span aria-hidden="true" />
            {isDemo
              ? t('positioning.mode.demo')
              : t('positioning.mode.camera')}
          </span>
          <span>
            {validationLabel}
          </span>
        </div>

        {cameraStatus === cameraStates.loading && !isDemo && (
          <div className="positioning-stage__loading" role="status">
            <span aria-hidden="true" />
            <p>{t('positioning.camera.loading')}</p>
          </div>
        )}

        {hasCameraError && (
          <div className="positioning-stage__error" role="alert">
            <span className="positioning-stage__error-mark" aria-hidden="true">
              !
            </span>
            <h2>{t('positioning.errors.title')}</h2>
            <p>
              {t(
                `positioning.errors.${
                  errorCode || 'unknown'
                }`,
              )}
            </p>
            <div className="positioning-stage__error-actions">
              <button type="button" onClick={onRetry}>
                {t('positioning.actions.retry')}
              </button>
              <button type="button" onClick={onBack}>
                {t('common.back')}
              </button>
            </div>
          </div>
        )}

        {!hasCameraError &&
          cameraStatus === cameraStates.active &&
          detectionStatus === detectionStates.loading && (
            <div className="positioning-stage__detection-status" role="status">
              {t('positioning.detection.loading')}
            </div>
          )}

        {!hasCameraError &&
          cameraStatus === cameraStates.active &&
          detectionStatus === detectionStates.error && (
            <div className="positioning-stage__detection-status" role="alert">
              {t(
                `positioning.detection.${
                  detectionError || 'unavailable'
                }`,
              )}
            </div>
          )}

        {!hasCameraError &&
          (isDemo ||
            (cameraStatus === cameraStates.active &&
              detectionStatus === detectionStates.active)) && (
            <>
              <div
                className="positioning-stage__instruction"
                role="status"
                aria-live="polite"
              >
                <span>{t('positioning.instructionLabel')}</span>
                <strong>
                  {t(
                    `positioning.instructions.${primaryInstruction}`,
                  )}
                </strong>
              </div>
              <div
                className="positioning-stage__stability"
                role="progressbar"
                aria-label={t('positioning.stability.label')}
                aria-valuemin="0"
                aria-valuemax="100"
                aria-valuenow={Math.round(stabilityProgress * 100)}
              >
                <span
                  style={{
                    transform: `scaleX(${stabilityProgress})`,
                  }}
                />
              </div>
            </>
          )}
      </div>

      <div className="positioning-stage__privacy">
        <span aria-hidden="true" />
        <p>
          {isDemo
            ? t('positioning.mode.demoDescription')
            : t('positioning.camera.privacy')}
        </p>
      </div>
    </section>
  )
}

export default PositioningCameraStage
