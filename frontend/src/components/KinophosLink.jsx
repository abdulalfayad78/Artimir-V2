import useTranslation from '../i18n/useTranslation'

function KinophosLink({ className = '' }) {
  const { t } = useTranslation()
  const classes = ['kinophos-link', className].filter(Boolean).join(' ')

  return (
    <a
      className={classes}
      href="https://kinophos.com"
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t('common.openKinophosSite')}
    >
      <span className="kinophos-link__mark" aria-hidden="true">
        K
      </span>
      <span className="kinophos-link__name">{t('common.kinophos')}</span>
    </a>
  )
}

export default KinophosLink
