import { useEffect, useRef, useState } from 'react'
import AnimatedBackground from '../components/AnimatedBackground'
import PageTransition from '../components/PageTransition'
import PrimaryButton from '../components/PrimaryButton'
import ProgressIndicator from '../components/ProgressIndicator'
import useExperience from '../context/useExperience'
import customizationOptions from '../data/customizationOptions'
import useTranslation from '../i18n/useTranslation'

function CustomizationPage({
  onBack,
  onCancel,
  onCustomizationChanged,
  onCustomizationStarted,
  onContinue,
}) {
  const { session, setCustomization } = useExperience()
  const { t, isRtl } = useTranslation()
  const [submitState, setSubmitState] = useState('idle')
  const mountedRef = useRef(true)
  const startedRef = useRef(false)
  const submitLockRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true

    if (!startedRef.current) {
      startedRef.current = true
      onCustomizationStarted()
    }

    return () => {
      mountedRef.current = false
    }
  }, [onCustomizationStarted])

  const handleSelection = (experienceStyle) => {
    if (submitLockRef.current) {
      return
    }

    const customization = { experienceStyle }
    setCustomization(customization)
    setSubmitState('idle')
    onCustomizationChanged(customization)
  }

  const handleContinue = async () => {
    if (!session.customization || submitLockRef.current) {
      return
    }

    submitLockRef.current = true
    setSubmitState('loading')

    try {
      await onContinue()
    } catch {
      if (mountedRef.current) {
        submitLockRef.current = false
        setSubmitState('error')
      }
    }
  }

  const isLoading = submitState === 'loading'

  return (
    <PageTransition className="experience-page profile-page customization-page">
      <AnimatedBackground />

      <header className="profile-page__header">
        <button
          className="back-button"
          type="button"
          disabled={isLoading}
          onClick={onBack}
        >
          <span aria-hidden="true">{isRtl ? '→' : '←'}</span>
          <span>{t('common.back')}</span>
        </button>

        <div className="language-page__wordmark">
          <span aria-hidden="true">A</span>
          {t('common.artimir')}
        </div>

        <ProgressIndicator current={3} total={10} />
      </header>

      <main className="profile-page__content" aria-busy={isLoading}>
        <div className="profile-page__heading">
          <p className="section-kicker">
            <span aria-hidden="true" />
            {t('customization.step')}
          </p>
          <h1>{t('customization.title')}</h1>
          <p>{t('customization.description')}</p>
        </div>

        <div
          className="customization-grid"
          role="radiogroup"
          aria-label={t('customization.optionsLabel')}
        >
          {customizationOptions.map((option, index) => {
            const selected =
              session.customization?.experienceStyle === option.value

            return (
              <button
                className="customization-card"
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={isLoading}
                key={option.value}
                onClick={() => handleSelection(option.value)}
              >
                <span className="customization-card__number">
                  0{index + 1}
                </span>
                <strong>{t(option.labelKey)}</strong>
                <span>{t(option.descriptionKey)}</span>
                <i aria-hidden="true">{selected ? '✓' : '○'}</i>
              </button>
            )
          })}
        </div>

        <div className="profile-page__action customization-page__action">
          <PrimaryButton
            disabled={!session.customization || isLoading}
            onClick={handleContinue}
          >
            {isLoading
              ? t('sync.sending')
              : submitState === 'error'
                ? t('sync.retry')
                : t('common.continue')}
          </PrimaryButton>

          <p role="status" aria-live="polite">
            {submitState === 'error'
              ? t('sync.networkError')
              : t('customization.status')}
          </p>

          <button
            className="text-action"
            type="button"
            disabled={isLoading}
            onClick={onCancel}
          >
            {t('sync.cancel')}
          </button>
        </div>
      </main>
    </PageTransition>
  )
}

export default CustomizationPage
