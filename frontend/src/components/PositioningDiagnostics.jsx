import positioningConfig from '../config/positioningConfig'
import useTranslation from '../i18n/useTranslation'

function formatMetric(value, digits = 3) {
  return Number.isFinite(value) ? value.toFixed(digits) : '—'
}

function getDistanceDiagnostic(camera) {
  const thresholds =
    positioningConfig.cameraThresholds[camera.cameraId]
  const value = camera.faceWidthRatio

  if (!Number.isFinite(value)) {
    return {
      state: '—',
      delta: null,
      minimum: thresholds.minFaceWidthRatio,
      maximum: thresholds.maxFaceWidthRatio,
    }
  }

  if (value < thresholds.minFaceWidthRatio) {
    return {
      state: 'too_far',
      delta: value - thresholds.minFaceWidthRatio,
      minimum: thresholds.minFaceWidthRatio,
      maximum: thresholds.maxFaceWidthRatio,
    }
  }

  if (value > thresholds.maxFaceWidthRatio) {
    return {
      state: 'too_close',
      delta: value - thresholds.maxFaceWidthRatio,
      minimum: thresholds.minFaceWidthRatio,
      maximum: thresholds.maxFaceWidthRatio,
    }
  }

  return {
    state: 'correct',
    delta: 0,
    minimum: thresholds.minFaceWidthRatio,
    maximum: thresholds.maxFaceWidthRatio,
  }
}

function PositioningDiagnostics({
  completionState,
  currentRoute,
  currentSessionState,
  globalState,
  performanceInfo,
}) {
  const { t } = useTranslation()

  return (
    <section
      className="positioning-diagnostics"
      aria-labelledby="positioning-diagnostics-title"
    >
      <div className="positioning-diagnostics__heading">
        <div>
          <p>{t('positioning.diagnostics.kicker')}</p>
          <h2 id="positioning-diagnostics-title">
            {t('positioning.diagnostics.title')}
          </h2>
        </div>
        <div>
          <span>{globalState.mode.toUpperCase()}</span>
          <span>
            {formatMetric(performanceInfo.measuredFps, 1)} FPS
          </span>
        </div>
      </div>

      {globalState.mode === 'single' && (
        <p className="positioning-diagnostics__notice">
          {t('positioning.diagnostics.singleModeNotice')}
        </p>
      )}

      <div className="positioning-diagnostics__summary">
        <span>
          raw blocking:{' '}
          <strong>{globalState.rawBlockingState ?? '—'}</strong>
        </span>
        <span>
          raw instruction:{' '}
          <strong>{globalState.rawInstruction}</strong>
        </span>
        <span>
          candidate:{' '}
          <strong>{globalState.candidateInstruction}</strong>
        </span>
        <span>
          displayed:{' '}
          <strong>{globalState.displayedInstruction}</strong>
        </span>
        <span>
          displayed age:{' '}
          <strong>
            {Math.round(globalState.displayedInstructionAgeMs)} ms
          </strong>
        </span>
        <span>
          blocking: <strong>{globalState.blockingReason ?? '—'}</strong>
        </span>
        <span>
          progress:{' '}
          <strong>
            {Math.round(globalState.stableProgress * 100)}%
          </strong>
        </span>
        <span>
          samples:{' '}
          <strong>{globalState.validMeasurementCount}</strong>/
          {positioningConfig.filtering.minimumValidMeasurements}
        </span>
        <span>
          final:{' '}
          <strong>
            {globalState.positionCorrect ? 'true' : 'false'}
          </strong>
        </span>
        <span>
          holdStillStartedAt:{' '}
          <strong>{globalState.holdStillStartedAt ?? 'â€”'}</strong>
        </span>
        <span>
          holdStillElapsed:{' '}
          <strong>
            {Math.round(globalState.holdStillElapsedMs ?? 0)} ms
          </strong>
        </span>
        <span>
          holdStillRequired:{' '}
          <strong>
            {Math.round(globalState.holdStillRequiredMs ?? 0)} ms
          </strong>
        </span>
        <span>
          completionLatched:{' '}
          <strong>
            {String(completionState?.completionLatched ?? false)}
          </strong>
        </span>
        <span>
          completionCallbackCalled:{' '}
          <strong>
            {String(completionState?.completionCallbackCalled ?? false)}
          </strong>
        </span>
        <span>
          socketEventSent:{' '}
          <strong>
            {String(completionState?.socketEventSent ?? false)}
          </strong>
        </span>
        <span>
          currentSessionState:{' '}
          <strong>{currentSessionState ?? 'â€”'}</strong>
        </span>
        <span>
          currentRoute: <strong>{currentRoute ?? 'â€”'}</strong>
        </span>
        <span>
          confirmation:{' '}
          <strong>
            {globalState.instructionConfirmationSamples}/
            {positioningConfig.filtering.nonCriticalDisplayConfirmSamples}
          </strong>{' '}
          ({Math.round(globalState.instructionConfirmationAgeMs)} ms)
        </span>
        <span>
          raw consecutive:{' '}
          <strong>{globalState.rawInstructionSampleCount}</strong>
        </span>
        <span>
          reset:{' '}
          <strong>{globalState.progressResetReason ?? '—'}</strong>
        </span>
      </div>

      <div className="positioning-diagnostics__cameras">
        {Object.values(globalState.cameras).map((camera) => {
          const distance = getDistanceDiagnostic(camera)

          return (
            <article key={camera.cameraId}>
            <header>
              <strong>{camera.cameraId}</strong>
              <span>
                {camera.simulated
                  ? 'simulated'
                  : camera.available
                    ? 'available'
                    : 'unavailable'}
              </span>
            </header>
            <dl>
              <div><dt>faces total / ROI / relevant</dt><dd>{camera.totalFaceCount} / {camera.roiFaceCount} / {camera.relevantFaceCount}</dd></div>
              <div><dt>faces confirmed</dt><dd>{camera.confirmedFaceCount}</dd></div>
              <div><dt>faces rejected</dt><dd>{camera.rejectedFaceCount}</dd></div>
              <div><dt>candidate samples</dt><dd>{camera.primaryCandidateSampleCount ?? 0}</dd></div>
              <div><dt>candidate primary</dt><dd>{camera.candidatePrimaryFace ? 'yes' : 'no'}</dd></div>
              <div><dt>confirmed primary</dt><dd>{camera.confirmedPrimaryFace ? 'yes' : 'no'}</dd></div>
              <div><dt>multiple coherent</dt><dd>{String(camera.multipleFacesCoherent)}</dd></div>
              <div><dt>ignored background</dt><dd>{camera.ignoredBackgroundFaceCount}</dd></div>
              <div><dt>primary index</dt><dd>{camera.primaryFaceSourceIndex ?? '—'}</dd></div>
              <div><dt>secondary / primary</dt><dd>{formatMetric(camera.secondaryToPrimaryAreaRatio, 2)}</dd></div>
              <div><dt>confidence</dt><dd>{camera.confidenceAvailable ? formatMetric(camera.confidence, 2) : 'unavailable'}</dd></div>
              <div><dt>confidence source</dt><dd>{camera.confidenceSource ?? '—'}</dd></div>
              <div><dt>center X/Y</dt><dd>{formatMetric(camera.centerX)} / {formatMetric(camera.centerY)}</dd></div>
              <div><dt>face width raw</dt><dd>{formatMetric(camera.rawFaceWidthRatio)}</dd></div>
              <div><dt>face width filtered</dt><dd>{formatMetric(camera.faceWidthRatio)}</dd></div>
              <div><dt>expected width</dt><dd>{formatMetric(distance.minimum)}–{formatMetric(distance.maximum)}</dd></div>
              <div><dt>distance delta</dt><dd>{formatMetric(distance.delta)}</dd></div>
              <div><dt>distance state</dt><dd>{distance.state}</dd></div>
              <div><dt>face height</dt><dd>{formatMetric(camera.faceHeightRatio)}</dd></div>
              <div><dt>roll</dt><dd>{formatMetric(camera.roll, 1)}°</dd></div>
              <div><dt>yaw</dt><dd>{formatMetric(camera.yaw, 1)}°</dd></div>
              <div><dt>pitch</dt><dd>{formatMetric(camera.pitch, 1)}°</dd></div>
              <div><dt>stability</dt><dd>{formatMetric(camera.stability, 2)}</dd></div>
              <div><dt>age</dt><dd>{camera.dataAgeMs ?? '—'} ms</dd></div>
              <div><dt>mapping</dt><dd>{String(camera.usableForMapping)}</dd></div>
              <div><dt>blocking</dt><dd>{camera.blockingReason ?? '—'}</dd></div>
            </dl>
            {camera.faces.length > 0 && (
              <ol>
                {camera.faces.map((face) => (
                  <li key={face.sourceIndex}>
                    #{face.sourceIndex + 1} · area {formatMetric(face.area, 4)} · {face.classification}
                  </li>
                ))}
              </ol>
            )}
            </article>
          )
        })}
      </div>
    </section>
  )
}

export default PositioningDiagnostics
