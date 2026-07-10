import useTranslation from '../i18n/useTranslation'

function ProgressIndicator({ current, total }) {
  const { t } = useTranslation()
  const progress = `${(current / total) * 100}%`

  return (
    <div
      className="progress-indicator"
      aria-label={t('common.progress', { current, total })}
    >
      <span className="progress-indicator__current">
        {String(current).padStart(2, '0')}
      </span>
      <span className="progress-indicator__track" aria-hidden="true">
        <span
          className="progress-indicator__value"
          style={{ '--progress': progress }}
        />
      </span>
      <span className="progress-indicator__total">
        {String(total).padStart(2, '0')}
      </span>
    </div>
  )
}

export default ProgressIndicator
