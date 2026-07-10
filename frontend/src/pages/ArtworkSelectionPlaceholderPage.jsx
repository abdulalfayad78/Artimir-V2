import AnimatedBackground from '../components/AnimatedBackground'
import KinophosLink from '../components/KinophosLink'
import PageTransition from '../components/PageTransition'
import ProgressIndicator from '../components/ProgressIndicator'
import useTranslation from '../i18n/useTranslation'

function ArtworkSelectionPlaceholderPage({ onBack }) {
  const { t, isRtl } = useTranslation()

  return (
    <PageTransition className="experience-page artwork-placeholder-page">
      <AnimatedBackground />
      <header>
        <button className="back-button" type="button" onClick={onBack}>
          <span aria-hidden="true">{isRtl ? '→' : '←'}</span>
          <span>{t('common.back')}</span>
        </button>
        <KinophosLink />
        <ProgressIndicator current={6} total={10} />
      </header>
      <main>
        <p className="section-kicker">
          <span aria-hidden="true" />
          {t('artworkSelection.step')}
        </p>
        <h1>{t('artworkSelection.title')}</h1>
        <p>{t('artworkSelection.placeholder')}</p>
      </main>
    </PageTransition>
  )
}

export default ArtworkSelectionPlaceholderPage
