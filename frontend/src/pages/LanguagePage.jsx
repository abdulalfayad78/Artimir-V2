import { useEffect, useRef, useState } from 'react'
import AnimatedBackground from '../components/AnimatedBackground'
import PageTransition from '../components/PageTransition'
import ProgressIndicator from '../components/ProgressIndicator'
import useExperience from '../context/useExperience'
import languages from '../data/languages'
import useTranslation from '../i18n/useTranslation'

const languageTransitionDuration = 400

function LanguagePage({ onComplete, onLanguageSelected }) {
  const { session, setLanguage } = useExperience()
  const { t, isRtl } = useTranslation()
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [hasError, setHasError] = useState(false)
  const transitionLock = useRef(false)
  const transitionTimer = useRef(null)

  useEffect(
    () => () => {
      if (transitionTimer.current) {
        window.clearTimeout(transitionTimer.current)
      }
    },
    [],
  )

  const handleLanguageSelection = async (language) => {
    if (transitionLock.current) {
      return
    }

    transitionLock.current = true
    setLanguage(language)
    setIsTransitioning(true)
    setHasError(false)

    const transitionDelay = new Promise((resolve) => {
      transitionTimer.current = window.setTimeout(
        resolve,
        languageTransitionDuration,
      )
    })

    try {
      await Promise.all([
        onLanguageSelected(language),
        transitionDelay,
      ])
      onComplete()
    } catch {
      transitionLock.current = false
      setIsTransitioning(false)
      setHasError(true)
    }
  }

  return (
    <PageTransition
      className={`experience-page language-page${
        isTransitioning ? ' language-page--transitioning' : ''
      }`}
    >
      <AnimatedBackground />

      <header className="language-page__header">
        <span className="language-page__header-spacer" aria-hidden="true" />

        <div
          className="language-page__wordmark"
          aria-label={t('common.artimir')}
        >
          <span aria-hidden="true">A</span>
          {t('common.artimir')}
        </div>

        <ProgressIndicator current={1} total={10} />
      </header>

      <main className="language-page__content" aria-busy={isTransitioning}>
        <div className="language-page__heading">
          <p className="section-kicker">
            <span aria-hidden="true" />
            {t('languagePage.customize')}
          </p>
          <h1>{t('languagePage.title')}</h1>
          <p>{t('languagePage.description')}</p>
        </div>

        <div
          className="language-grid"
          aria-label={t('languagePage.availableLabel')}
        >
          {languages.map((language, index) => {
            const isSelected = session.language === language.id

            return (
              <button
                className="language-card"
                style={{ '--card-index': index }}
                type="button"
                key={language.id}
                aria-pressed={isSelected}
                disabled={isTransitioning}
                onClick={() => handleLanguageSelection(language.id)}
              >
                <span className="language-card__code">{language.code}</span>
                <span
                  className="language-card__label"
                  lang={language.id}
                  dir={language.direction}
                >
                  {language.label}
                </span>
                <span className="language-card__state" aria-hidden="true">
                  {isSelected ? '✓' : isRtl ? '←' : '→'}
                </span>
                <span className="language-card__line" aria-hidden="true" />
              </button>
            )
          })}
        </div>

        <p className="language-page__hint" aria-live="polite">
          {isTransitioning
            ? t('languagePage.statusPreparing')
            : hasError
            ? t('sync.networkError')
            : session.language
            ? t('languagePage.statusSelected')
            : t('languagePage.statusPrompt')}
        </p>
      </main>

      <footer className="language-page__footer">
        <span>{t('common.artimir')}</span>
        <span>{t('languagePage.footerStep')}</span>
      </footer>
    </PageTransition>
  )
}

export default LanguagePage
