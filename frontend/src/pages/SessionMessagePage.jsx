import AnimatedBackground from '../components/AnimatedBackground'
import PageTransition from '../components/PageTransition'
import PrimaryButton from '../components/PrimaryButton'
import useTranslation from '../i18n/useTranslation'

function SessionMessagePage({
  actionLabelKey = 'sync.retry',
  messageKey,
  onAction,
  titleKey,
}) {
  const { t } = useTranslation()

  return (
    <PageTransition className="experience-page session-message-page">
      <AnimatedBackground />
      <main>
        <div className="language-page__wordmark">
          <span aria-hidden="true">A</span>
          {t('common.artimir')}
        </div>
        <p className="section-kicker">
          <span aria-hidden="true" />
          {t('sync.session')}
        </p>
        <h1>{t(titleKey)}</h1>
        <p>{t(messageKey)}</p>
        {onAction && (
          <PrimaryButton onClick={onAction}>
            {t(actionLabelKey)}
          </PrimaryButton>
        )}
      </main>
    </PageTransition>
  )
}

export default SessionMessagePage
