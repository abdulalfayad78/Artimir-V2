import {
  SESSION_STATUSES,
} from '../../../shared/sessionProtocol.js'
import AnimatedBackground from '../components/AnimatedBackground'
import PageTransition from '../components/PageTransition'
import useTranslation from '../i18n/useTranslation'

const statusKeys = {
  [SESSION_STATUSES.startPositioning]: 'sync.preparing',
  [SESSION_STATUSES.positioningActive]: 'sync.positioningActive',
  [SESSION_STATUSES.positioningCompleted]: 'sync.preparing',
  [SESSION_STATUSES.heightAdjustment]: 'sync.experienceActive',
  [SESSION_STATUSES.experienceActive]: 'sync.experienceActive',
  [SESSION_STATUSES.generating]: 'sync.generating',
  [SESSION_STATUSES.resultReady]: 'sync.resultSoon',
}

function LookAtArtimirPage({ onCancel, session }) {
  const { t, isRtl } = useTranslation()
  const statusKey =
    statusKeys[session?.status] ?? 'sync.preparing'

  return (
    <PageTransition className="experience-page handoff-page">
      <AnimatedBackground />

      <header className="handoff-page__header">
        <div className="language-page__wordmark">
          <span aria-hidden="true">A</span>
          {t('common.artimir')}
        </div>
        <span>{session?.id}</span>
      </header>

      <main className="handoff-page__content">
        <div className="handoff-page__screen" aria-hidden="true">
          <span />
          <i>{isRtl ? '←' : '→'}</i>
        </div>

        <p className="section-kicker">
          <span aria-hidden="true" />
          {t('lookAtArtimir.kicker')}
        </p>
        <h1>{t('lookAtArtimir.title')}</h1>
        <p className="handoff-page__description">
          {t('lookAtArtimir.description')}
        </p>

        <div className="handoff-page__status" role="status">
          <span aria-hidden="true" />
          <div>
            <strong>{t('lookAtArtimir.syncLabel')}</strong>
            <p>{t(statusKey)}</p>
          </div>
        </div>

        <button className="text-action" type="button" onClick={onCancel}>
          {t('sync.cancel')}
        </button>
      </main>
    </PageTransition>
  )
}

export default LookAtArtimirPage
