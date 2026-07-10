import AnimatedBackground from '../components/AnimatedBackground'
import PageTransition from '../components/PageTransition'
import useTranslation from '../i18n/useTranslation'

function DisplayPlaceholderPage({ descriptionKey, titleKey }) {
  const { t } = useTranslation()

  return (
    <PageTransition className="experience-page display-placeholder-page">
      <AnimatedBackground />
      <main>
        <div className="language-page__wordmark">
          <span aria-hidden="true">A</span>
          {t('common.artimir')}
        </div>
        <p className="section-kicker">
          <span aria-hidden="true" />
          {t('displayPlaceholder.kicker')}
        </p>
        <h1>{t(titleKey)}</h1>
        <p>{t(descriptionKey)}</p>
      </main>
    </PageTransition>
  )
}

export default DisplayPlaceholderPage
