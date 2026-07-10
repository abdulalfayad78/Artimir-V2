import { useRef, useState } from 'react'
import AnimatedBackground from '../components/AnimatedBackground'
import PageTransition from '../components/PageTransition'
import PrimaryButton from '../components/PrimaryButton'
import ProfileChoiceGroup from '../components/ProfileChoiceGroup'
import ProgressIndicator from '../components/ProgressIndicator'
import useExperience from '../context/useExperience'
import {
  ageRangeOptions,
  artFamiliarityOptions,
} from '../data/profileOptions'
import useTranslation from '../i18n/useTranslation'

function ProfilePage({ onBack, onContinue, onProfileChanged }) {
  const { session, setAgeRange, setArtFamiliarity } = useExperience()
  const { t, isRtl } = useTranslation()
  const [isContinuing, setIsContinuing] = useState(false)
  const [hasError, setHasError] = useState(false)
  const continueLock = useRef(false)
  const isProfileComplete = Boolean(
    session.ageRange && session.artFamiliarity,
  )

  const handleContinue = () => {
    if (!isProfileComplete || continueLock.current) {
      return
    }

    continueLock.current = true
    setIsContinuing(true)
    setHasError(false)

    Promise.resolve(onContinue()).catch(() => {
      continueLock.current = false
      setIsContinuing(false)
      setHasError(true)
    })
  }

  const handleAgeRangeChange = (ageRange) => {
    setAgeRange(ageRange)
    onProfileChanged({
      ageRange,
      artFamiliarity: session.artFamiliarity,
    })
  }

  const handleArtFamiliarityChange = (artFamiliarity) => {
    setArtFamiliarity(artFamiliarity)
    onProfileChanged({
      ageRange: session.ageRange,
      artFamiliarity,
    })
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

      <main className="profile-page__content" aria-busy={isContinuing}>
        <div className="profile-page__heading">
          <p className="section-kicker">
            <span aria-hidden="true" />
            {t('profile.step')}
          </p>
          <h1>{t('profile.title')}</h1>
          <p>{t('profile.description')}</p>
        </div>

        <div className="profile-page__sections">
          <ProfileChoiceGroup
            groupNumber="01"
            name="age-range"
            title={t('profile.ageTitle')}
            options={ageRangeOptions.map((option) => ({
              ...option,
              label: t(option.labelKey),
            }))}
            value={session.ageRange}
            onChange={handleAgeRangeChange}
            variant="age"
          />

          <ProfileChoiceGroup
            groupNumber="02"
            name="art-familiarity"
            title={t('profile.familiarityTitle')}
            options={artFamiliarityOptions.map((option) => ({
              ...option,
              label: t(option.labelKey),
            }))}
            value={session.artFamiliarity}
            onChange={handleArtFamiliarityChange}
            variant="familiarity"
          />
        </div>

        <div className="profile-page__action">
          <PrimaryButton
            disabled={!isProfileComplete || isContinuing}
            onClick={handleContinue}
          >
            {t('common.continue')}
          </PrimaryButton>
          <p aria-live="polite">
            {hasError
              ? t('sync.networkError')
              : isProfileComplete
              ? t('profile.statusComplete')
              : t('profile.statusIncomplete')}
          </p>
        </div>
      </main>
    </PageTransition>
  )
}

export default ProfilePage
