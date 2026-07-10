import { positioningInstructions } from '../detection/multiCameraAggregator'
import useTranslation from '../i18n/useTranslation'

function PositioningDemoControls({
  onChange,
  onUseCamera,
  value,
}) {
  const { t } = useTranslation()

  return (
    <section
      className="positioning-demo"
      aria-labelledby="positioning-demo-title"
    >
      <div className="positioning-demo__heading">
        <div>
          <p>{t('positioning.demo.kicker')}</p>
          <h2 id="positioning-demo-title">
            {t('positioning.demo.title')}
          </h2>
        </div>
        <button
          className="positioning-demo__camera-action"
          type="button"
          onClick={onUseCamera}
        >
          {t('positioning.actions.useCamera')}
        </button>
      </div>

      <p className="positioning-demo__description">
        {t('positioning.demo.description')}
      </p>

      <div
        className="positioning-demo__controls"
        aria-label={t('positioning.demo.controlsLabel')}
      >
        {Object.values(positioningInstructions).map((state) => (
          <button
            type="button"
            key={state}
            aria-pressed={value === state}
            onClick={() => onChange(state)}
          >
            {t(`positioning.instructions.${state}`)}
          </button>
        ))}
      </div>
    </section>
  )
}

export default PositioningDemoControls
