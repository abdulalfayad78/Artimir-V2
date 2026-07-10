import AnimatedBackground from '../components/AnimatedBackground'
import KinophosLink from '../components/KinophosLink'
import PageTransition from '../components/PageTransition'
import PrimaryButton from '../components/PrimaryButton'
import useTranslation from '../i18n/useTranslation'

function HomePage({ onBack, onStart }) {
  const { t, isRtl } = useTranslation()

  return (
    <PageTransition className="experience-page home-page">
      <AnimatedBackground />

      <header className="home-page__header intro-reveal intro-reveal--brand">
        <KinophosLink />
        <button className="back-button" type="button" onClick={onBack}>
          <span aria-hidden="true">{isRtl ? '→' : '←'}</span>
          <span>{t('common.back')}</span>
        </button>
      </header>

      <main className="home-page__content">
        <div className="home-page__signal intro-reveal intro-reveal--signal">
          <span />
          <span />
        </div>

        <p className="home-page__eyebrow intro-reveal intro-reveal--eyebrow">
          {t('home.presenter')}
        </p>

        <h1 className="home-page__title intro-reveal intro-reveal--title">
          {t('common.artimir')}
        </h1>

        <div
          className="home-page__statement"
          aria-label={t('home.statementAria')}
        >
          <span className="intro-reveal intro-reveal--statement-one">
            {t('home.statementLine1')}
          </span>
          <span className="intro-reveal intro-reveal--statement-two">
            {t('home.statementLine2')}{' '}
            <strong>{t('home.statementAccent')}</strong>
          </span>
        </div>

        <p className="home-page__description intro-reveal intro-reveal--description">
          {t('home.descriptionLine1')}
          <br className="home-page__description-break" />{' '}
          {t('home.descriptionLine2')}
        </p>

        <div className="home-page__action intro-reveal intro-reveal--action">
          <PrimaryButton onClick={onStart}>
            {t('home.start')}
          </PrimaryButton>
        </div>
      </main>

      <footer className="home-page__footer intro-reveal intro-reveal--footer">
        <span>{t('home.footerExperience')}</span>
        <span className="home-page__footer-status">
          <span aria-hidden="true" />
          {t('home.footerReady')}
        </span>
      </footer>
    </PageTransition>
  )
}

export default HomePage
