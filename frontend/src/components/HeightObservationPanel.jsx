import heightObservationConfig from '../config/heightObservationConfig.js'
import useTranslation from '../i18n/useTranslation'

function formatRatio(value) {
  return Number.isFinite(value) ? value.toFixed(3) : '—'
}

function HeightObservationPanel({
  automaticAdjustment,
  cameraStatus,
  detectionError,
  detectionStatus,
  errorCode,
  observation,
  showDebug = false,
  videoRef,
}) {
  const { t } = useTranslation()
  const markerTop = Number.isFinite(observation.eyeCenterY)
    ? `${Math.max(0, Math.min(1, observation.eyeCenterY)) * 100}%`
    : null
  const targetTop = `${heightObservationConfig.targetEyeY * 100}%`

  const automaticState = automaticAdjustment?.automaticState
  const automationEnabled = automaticAdjustment?.enabled === true
  const displayedMessageKey = automationEnabled
    ? `heightAdjustment.automatic.status.${automaticState}`
    : `heightAdjustment.observation.recommendations.${observation.displayedHeightRecommendation}`

  return (
    <section
      className={`height-observation height-observation--${observation.displayedHeightRecommendation}`}
      aria-labelledby="height-observation-title"
    >
      <div className="height-observation__copy">
        <p>{t('heightAdjustment.observation.kicker')}</p>
        <h2 id="height-observation-title">
          {t('heightAdjustment.observation.title')}
        </h2>
        <strong>{t(displayedMessageKey)}</strong>
        {automationEnabled &&
          automaticAdjustment.targetMm !== null &&
          automaticAdjustment.automaticState !== 'completed_once' && (
            <span>
              {t('heightAdjustment.automatic.target', {
                target: Math.round(automaticAdjustment.targetMm),
              })}
            </span>
          )}
        <span>
          {t('heightAdjustment.observation.stability', {
            count: observation.stableSampleCount,
          })}
        </span>
      </div>

      <div
        className="height-observation__stage"
        aria-label={t('heightAdjustment.observation.stageLabel')}
      >
        <video
          ref={videoRef}
          aria-label={t('positioning.camera.previewLabel')}
          muted
          playsInline
        />
        <span
          className="height-observation__target"
          style={{ top: targetTop }}
          aria-hidden="true"
        />
        {markerTop && (
          <span
            className="height-observation__eyes"
            style={{ top: markerTop }}
            aria-hidden="true"
          />
        )}
      </div>

      <div className="height-observation__status" role="status">
        <span>
          {t(`heightAdjustment.observation.camera.${cameraStatus}`)}
        </span>
        <span>
          {t(`heightAdjustment.observation.detection.${detectionStatus}`)}
        </span>
        {(errorCode || detectionError) && (
          <span>
            {t(
              `positioning.errors.${errorCode ?? 'detection_failed'}`,
            )}
          </span>
        )}
      </div>

      {showDebug && (
        <dl className="height-observation__debug">
          <div>
            <dt>faceDetected</dt>
            <dd>{String(observation.diagnostics?.faceDetected)}</dd>
          </div>
          <div>
            <dt>primaryFaceConfirmed</dt>
            <dd>
              {String(observation.diagnostics?.primaryFaceConfirmed)}
            </dd>
          </div>
          <div>
            <dt>faceValid</dt>
            <dd>{String(observation.diagnostics?.faceValid)}</dd>
          </div>
          <div>
            <dt>insideRoi</dt>
            <dd>{String(observation.diagnostics?.insideRoi)}</dd>
          </div>
          <div>
            <dt>faceSizeValid</dt>
            <dd>{String(observation.diagnostics?.faceSizeValid)}</dd>
          </div>
          <div>
            <dt>poseValid</dt>
            <dd>{String(observation.diagnostics?.poseValid)}</dd>
          </div>
          <div>
            <dt>eyesAvailable</dt>
            <dd>{String(observation.diagnostics?.eyesAvailable)}</dd>
          </div>
          <div>
            <dt>stable</dt>
            <dd>{String(observation.diagnostics?.stable)}</dd>
          </div>
          <div>
            <dt>eyeCenterY</dt>
            <dd>{formatRatio(observation.eyeCenterY)}</dd>
          </div>
          <div>
            <dt>targetEyeY</dt>
            <dd>{formatRatio(observation.targetEyeY)}</dd>
          </div>
          <div>
            <dt>verticalError</dt>
            <dd>{formatRatio(observation.verticalError)}</dd>
          </div>
          <div>
            <dt>image observation</dt>
            <dd>{observation.imageObservation}</dd>
          </div>
          <div>
            <dt>raw recommendation</dt>
            <dd>{observation.rawHeightRecommendation}</dd>
          </div>
          <div>
            <dt>displayed recommendation</dt>
            <dd>{observation.displayedHeightRecommendation}</dd>
          </div>
          <div>
            <dt>rawBlockingState</dt>
            <dd>{observation.diagnostics?.rawBlockingState ?? '—'}</dd>
          </div>
          <div>
            <dt>height block reason</dt>
            <dd>{observation.reason ?? '—'}</dd>
          </div>
          <div>
            <dt>stable samples</dt>
            <dd>{observation.stableSampleCount}</dd>
          </div>
          <div>
            <dt>data age</dt>
            <dd>
              {Number.isFinite(observation.dataAgeMs)
                ? `${Math.round(observation.dataAgeMs)} ms`
                : '—'}
            </dd>
          </div>
          <div>
            <dt>eye landmarks</dt>
            <dd>{observation.eyeCenterMethod ?? 'unavailable'}</dd>
          </div>
          <div>
            <dt>cameraVerticalDirection</dt>
            <dd>{heightObservationConfig.cameraVerticalDirection}</dd>
          </div>
        </dl>
      )}
    </section>
  )
}

export default HeightObservationPanel
