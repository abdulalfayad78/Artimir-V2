import { useEffect, useRef, useState } from 'react'
import AnimatedBackground from '../components/AnimatedBackground'
import PageTransition from '../components/PageTransition'
import ProfileChoiceGroup from '../components/ProfileChoiceGroup'
import ProgressIndicator from '../components/ProgressIndicator'
import useExperience from '../context/useExperience'
import {
  ageRangeOptions,
  artFamiliarityOptions,
} from '../data/profileOptions'
import useTranslation from '../i18n/useTranslation'
import {
  PHONE_PROFILE_STEPS,
  createCompletePhoneProfile,
  getInitialPhoneProfileStep,
  goBackToPhoneProfileAge,
  selectPhoneProfileAge,
} from '../profile/phoneProfileFlow'

function ProfilePage({ onBack, onContinue }) {
  const { session, setAgeRange, setArtFamiliarity } = useExperience()
  const { t, isRtl } = useTranslation()
  const [profileStep, setProfileStep] = useState(() =>
    getInitialPhoneProfileStep(session),
  )
  const [selectedAgeRange, setSelectedAgeRange] = useState(
    session.ageRange,
  )
  const [
    selectedArtFamiliarity,
    setSelectedArtFamiliarity,
  ] = useState(session.artFamiliarity)
  const [isContinuing, setIsContinuing] = useState(false)
  const [hasError, setHasError] = useState(false)
  const continueLock = useRef(false)
  const isAgeStep = profileStep === PHONE_PROFILE_STEPS.age
  const isFamiliarityStep =
    profileStep === PHONE_PROFILE_STEPS.familiarity

  useEffect(() => {
    setSelectedAgeRange(session.ageRange)
  }, [session.ageRange])

  useEffect(() => {
    setSelectedArtFamiliarity(session.artFamiliarity)
  }, [session.artFamiliarity])

  const submitCompleteProfile = (profile) => {
    if (!profile || continueLock.current) {
      return
    }

    continueLock.current = true
    setIsContinuing(true)
    setHasError(false)

    Promise.resolve(onContinue(profile)).catch(() => {
      continueLock.current = false
      setIsContinuing(false)
      setHasError(true)
    })
  }

  const handleAgeRangeChange = (ageRange) => {
    const nextState = selectPhoneProfileAge(
      {
        ageRange: selectedAgeRange,
        artFamiliarity: selectedArtFamiliarity,
        step: profileStep,
      },
      ageRange,
    )

    setSelectedAgeRange(nextState.ageRange)
    setProfileStep(nextState.step)
    setHasError(false)
    setAgeRange(ageRange)
  }

  const handleArtFamiliarityChange = (artFamiliarity) => {
    const completeProfile = createCompletePhoneProfile({
      ageRange: selectedAgeRange,
      artFamiliarity,
    })

    if (!completeProfile) {
      setProfileStep(PHONE_PROFILE_STEPS.age)
      return
    }

    setSelectedArtFamiliarity(artFamiliarity)
    setArtFamiliarity(artFamiliarity)
    submitCompleteProfile(completeProfile)
  }

  const handleStepBack = () => {
    const nextState = goBackToPhoneProfileAge({
      ageRange: selectedAgeRange,
      artFamiliarity: selectedArtFamiliarity,
      step: profileStep,
    })

    setProfileStep(nextState.step)
    setHasError(false)
  }

  return (
    <PageTransition className="experience-page profile-page">
      <AnimatedBackground />

      <header className="profile-page__header">
        <button
          className="back-button"
          type="button"
          disabled={isContinuing}
          onClick={onBack}
        >
          <span aria-hidden="true">{isRtl ? '→' : '←'}</span>
          <span>{t('common.back')}</span>
        </button>

        <div
          className="language-page__wordmark"
          aria-label={t('common.artimir')}
        >
          <span aria-hidden="true">A</span>
          {t('common.artimir')}
        </div>

        <ProgressIndicator current={2} total={10} />
      </header>

      <main
        className="profile-page__content profile-page__content--stepped"
        aria-busy={isContinuing}
      >
        <div className="profile-page__heading">
          <p className="section-kicker">
            <span aria-hidden="true" />
            {t('profile.step')}
          </p>
          <h1>{t('profile.title')}</h1>
        </div>

        <div className="profile-page__sections profile-page__sections--single">
          {isAgeStep ? (
            <ProfileChoiceGroup
              groupNumber="01"
              name="age-range"
              title={t('profile.ageTitle')}
              options={ageRangeOptions.map((option) => ({
                ...option,
                label: t(option.labelKey),
              }))}
              value={selectedAgeRange}
              onChange={handleAgeRangeChange}
              variant="age"
              disabled={isContinuing}
            />
          ) : null}

          {isFamiliarityStep ? (
            <ProfileChoiceGroup
              groupNumber="02"
              name="art-familiarity"
              title={t('profile.familiarityTitle')}
              options={artFamiliarityOptions.map((option) => ({
                ...option,
                label: t(option.labelKey),
              }))}
              value={selectedArtFamiliarity}
              onChange={handleArtFamiliarityChange}
              variant="familiarity"
              disabled={isContinuing}
            />
          ) : null}
        </div>

        <div className="profile-page__action profile-page__action--stepped">
          {isFamiliarityStep ? (
            <button
              className="profile-step-back"
              type="button"
              disabled={isContinuing}
              onClick={handleStepBack}
            >
              <span aria-hidden="true">{isRtl ? '→' : '←'}</span>
              <span>{t('common.back')}</span>
            </button>
          ) : null}

          <p aria-live="polite">
            {hasError
              ? t('sync.networkError')
              : isContinuing
              ? t('profile.statusComplete')
              : '\u00a0'}
          </p>
        </div>
      </main>
    </PageTransition>
  )
}

export default ProfilePage
