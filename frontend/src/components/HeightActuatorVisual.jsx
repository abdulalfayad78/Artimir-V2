import heightAdjustmentConfig from '../config/heightAdjustmentConfig'
import useTranslation from '../i18n/useTranslation'

function HeightActuatorVisual({ state, showTechnicalDetails = false }) {
  const { t } = useTranslation()
  const range = state.maxPositionMm - state.minPositionMm
  const positionRatio =
    range > 0 && Number.isFinite(state.currentPositionMm)
      ? (state.currentPositionMm - state.minPositionMm) / range
      : 0
  const targetRatio =
    Number.isFinite(state.targetPositionMm) && range > 0
      ? (state.targetPositionMm - state.minPositionMm) / range
      : null
  const movementRange = Number.isFinite(state.targetPositionMm)
    ? Math.abs(
        state.targetPositionMm -
          heightAdjustmentConfig.initialPositionMm,
      )
    : 0
  const movementProgress =
    movementRange > 0
      ? Math.min(
          1,
          Math.abs(
            state.currentPositionMm -
              heightAdjustmentConfig.initialPositionMm,
          ) / movementRange,
        )
      : state.status === 'complete'
        ? 1
        : 0

  return (
    <section
      className="height-actuator"
      aria-label={t('heightAdjustment.visual.ariaLabel')}
    >
      <div className="height-actuator__scale" aria-hidden="true">
        {showTechnicalDetails && (
          <>
            <span>{state.maxPositionMm}</span>
            <span>{state.minPositionMm}</span>
          </>
        )}
      </div>
      <div className="height-actuator__rail" aria-hidden="true">
        <span
          className="height-actuator__range"
          style={{ height: `${positionRatio * 100}%` }}
        />
        <span
          className="height-actuator__carriage"
          style={{ bottom: `${positionRatio * 100}%` }}
        />
        {showTechnicalDetails && targetRatio !== null && (
          <span
            className="height-actuator__target"
            style={{ bottom: `${targetRatio * 100}%` }}
          />
        )}
      </div>
      <div className="height-actuator__progress">
        <span>{t('heightAdjustment.progress')}</span>
        <strong>{Math.round(movementProgress * 100)}%</strong>
        <div
          role="progressbar"
          aria-label={t('heightAdjustment.progress')}
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow={Math.round(movementProgress * 100)}
        >
          <span
            style={{ transform: `scaleX(${movementProgress})` }}
          />
        </div>
      </div>
    </section>
  )
}

export default HeightActuatorVisual
