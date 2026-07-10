import {
  SESSION_STATUSES,
} from '../../../shared/sessionProtocol.js'
import AnimatedBackground from '../components/AnimatedBackground'
import PageTransition from '../components/PageTransition'
import useTranslation from '../i18n/useTranslation'

const displayStatusKeys = {
  [SESSION_STATUSES.waitingForPhone]: 'displayWaiting.scan',
  [SESSION_STATUSES.phoneConnected]: 'displayWaiting.phoneConnected',
  [SESSION_STATUSES.languageSelected]: 'displayWaiting.profileProgress',
  [SESSION_STATUSES.profileInProgress]:
    'displayWaiting.profileProgress',
  [SESSION_STATUSES.profileCompleted]:
    'displayWaiting.customizationProgress',
  [SESSION_STATUSES.customizationInProgress]:
    'displayWaiting.customizationProgress',
  [SESSION_STATUSES.customizationCompleted]:
    'displayWaiting.preparing',
}

function DisplayWaitingPage({
  bootstrapStatus,
  qrCodeDataUrl,
  qrDiagnostics,
  session,
  sessionError,
}) {
  const { t } = useTranslation()
  const statusKey =
    session && session.phoneConnected === false
      ? 'displayWaiting.phoneDisconnected'
      : displayStatusKeys[session?.status] ?? 'displayWaiting.connecting'

  return (
    <PageTransition className="experience-page display-waiting-page">
      <AnimatedBackground />

      <header className="display-waiting-page__header">
        <div className="language-page__wordmark">
          <span aria-hidden="true">A</span>
          {t('common.artimir')}
        </div>
        <span className="display-waiting-page__system">
          <i aria-hidden="true" />
          {t('displayWaiting.systemReady')}
        </span>
      </header>

      <main className="display-waiting-page__content">
        <section>
          <p className="section-kicker">
            <span aria-hidden="true" />
            {t('displayWaiting.kicker')}
          </p>
          <h1>{t('displayWaiting.title')}</h1>
          <p>{t(statusKey)}</p>

          <div className="display-waiting-page__live" role="status">
            <span aria-hidden="true" />
            {sessionError
              ? t('sync.networkError')
              : bootstrapStatus === 'loading'
                ? t('displayWaiting.connecting')
                : t(statusKey)}
          </div>
        </section>

        <section className="display-waiting-page__pairing">
          <div className="display-waiting-page__qr">
            {qrCodeDataUrl ? (
              <img
                src={qrCodeDataUrl}
                alt={t('displayWaiting.qrAlt')}
              />
            ) : (
              <span aria-hidden="true" />
            )}
          </div>
          <p>{t('displayWaiting.sessionCode')}</p>
          <strong>{session?.id ?? '------'}</strong>
          <dl className="display-waiting-page__qr-debug">
            <div>
              <dt>phoneBaseUrl</dt>
              <dd>{qrDiagnostics?.phoneBaseUrl ?? '—'}</dd>
            </div>
            <div>
              <dt>qrUrl</dt>
              <dd>{qrDiagnostics?.qrUrl ?? '—'}</dd>
            </div>
            <div>
              <dt>mode QR</dt>
              <dd>{qrDiagnostics?.qrMode ?? 'unconfigured'}</dd>
            </div>
            {qrDiagnostics?.error && (
              <div>
                <dt>erreur</dt>
                <dd>{qrDiagnostics.error}</dd>
              </div>
            )}
          </dl>
        </section>
      </main>
    </PageTransition>
  )
}

export default DisplayWaitingPage
