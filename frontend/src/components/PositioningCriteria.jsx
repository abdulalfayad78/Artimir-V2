import useTranslation from '../i18n/useTranslation'

function PositioningCriteria({ criteria }) {
  const { t } = useTranslation()

  return (
    <section
      className="positioning-criteria"
      aria-labelledby="positioning-criteria-title"
    >
      <div className="positioning-criteria__heading">
        <p>{t('positioning.criteria.kicker')}</p>
        <h2 id="positioning-criteria-title">
          {t('positioning.criteria.title')}
        </h2>
      </div>

      <ol className="positioning-criteria__list">
        {criteria.map((criterion, index) => (
          <li
            className="positioning-criterion"
            data-state={criterion.state}
            key={criterion.id}
            aria-label={`${t(
              `positioning.criteria.${criterion.id}`,
            )} — ${t(
              `positioning.criteria.status.${criterion.state}`,
            )}`}
          >
            <span className="positioning-criterion__number">
              {String(index + 1).padStart(2, '0')}
            </span>
            <span className="positioning-criterion__copy">
              <strong>
                {t(`positioning.criteria.${criterion.id}`)}
              </strong>
              <small>
                {t(
                  `positioning.criteria.status.${criterion.state}`,
                )}
              </small>
            </span>
            <span className="positioning-criterion__state" aria-hidden="true">
              {criterion.state === 'valid'
                ? '✓'
                : criterion.state === 'current'
                  ? '•'
                  : criterion.state === 'lost'
                    ? '×'
                    : '—'}
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}

export default PositioningCriteria
