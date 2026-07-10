import useTranslation from '../i18n/useTranslation'

function HeightAdjustmentDebugPanel({
  automaticAdjustment,
  onClearEmergencyStop,
  onClearLocalError,
  onEmergencyStop,
  onHome,
  onMoveRelative,
  onMoveTo,
  onRefreshStatus,
  onReset,
  onSimulateError,
  onStop,
  observation,
  state,
}) {
  const { t } = useTranslation()
  const isComplete = state.status === 'complete'
  const isLocalService = state.mode === 'localService'
  const isBusy = ['homing', 'moving_up', 'moving_down'].includes(
    state.status,
  )
  const canMove =
    !isComplete &&
    !isBusy &&
    state.connected &&
    state.positionKnown &&
    !state.error
  const canStop = !isComplete && state.connected
  const armDiagnostics = automaticAdjustment?.armDiagnostics
  const canArmAutomatic = armDiagnostics?.canArm === true
  const canRearmAutomatic = Boolean(
    automaticAdjustment?.enabled &&
      ['completed_once', 'blocked', 'error'].includes(
        automaticAdjustment.automaticState,
      ),
  )
  const invoke = (command) => {
    if (isComplete) {
      return
    }

    try {
      Promise.resolve(command()).catch(() => {})
    } catch {
      // The controller state and diagnostics expose rejected commands.
    }
  }
  const confirmHome = () => {
    if (
      window.confirm(
        t('heightAdjustment.debug.confirmHome'),
      )
    ) {
      invoke(onHome)
    }
  }

  return (
    <section
      className="height-debug-panel"
      aria-labelledby="height-debug-title"
    >
      <div>
        <p>{t('heightAdjustment.debug.kicker')}</p>
        <h2 id="height-debug-title">
          {t('heightAdjustment.debug.title')}
        </h2>
        <p className="height-debug-panel__notice">
          {t('heightAdjustment.debug.noHardwareNotice')}
        </p>
      </div>

      <dl className="height-debug-panel__metrics">
        <div>
          <dt>{t('heightAdjustment.currentPosition')}</dt>
          <dd>
            {Number.isFinite(state.currentPositionMm)
              ? `${Math.round(state.currentPositionMm)} mm`
              : t('heightAdjustment.notAvailable')}
          </dd>
        </div>
        <div>
          <dt>{t('heightAdjustment.targetPosition')}</dt>
          <dd>
            {Number.isFinite(state.targetPositionMm)
              ? `${Math.round(state.targetPositionMm)} mm`
              : t('heightAdjustment.notAvailable')}
          </dd>
        </div>
        <div>
          <dt>{t('heightAdjustment.mode')}</dt>
          <dd>{t(`heightAdjustment.modeValue.${state.mode}`)}</dd>
        </div>
        {observation && (
          <>
            <div>
              <dt>eyeCenterY</dt>
              <dd>
                {Number.isFinite(observation.eyeCenterY)
                  ? observation.eyeCenterY.toFixed(3)
                  : '—'}
              </dd>
            </div>
            <div>
              <dt>targetEyeY</dt>
              <dd>
                {Number.isFinite(observation.targetEyeY)
                  ? observation.targetEyeY.toFixed(3)
                  : '—'}
              </dd>
            </div>
            <div>
              <dt>verticalError</dt>
              <dd>
                {Number.isFinite(observation.verticalError)
                  ? observation.verticalError.toFixed(3)
                  : '—'}
              </dd>
            </div>
            <div>
              <dt>raw height recommendation</dt>
              <dd>{observation.rawHeightRecommendation}</dd>
            </div>
            <div>
              <dt>displayed height recommendation</dt>
              <dd>{observation.displayedHeightRecommendation}</dd>
            </div>
            <div>
              <dt>stable samples</dt>
              <dd>{observation.stableSampleCount}</dd>
            </div>
            <div>
              <dt>data age</dt>
              <dd>
                {Number.isFinite(observation.dataAgeMs)
                  ? `${Math.round(observation.dataAgeMs)} ms`
                  : '—'}
              </dd>
            </div>
          </>
        )}
        {automaticAdjustment && (
          <>
            <div>
              <dt>automatic enabled</dt>
              <dd>{String(automaticAdjustment.enabled)}</dd>
            </div>
            <div>
              <dt>automatic state</dt>
              <dd>{automaticAdjustment.automaticState}</dd>
            </div>
            <div>
              <dt>automatic target</dt>
              <dd>
                {Number.isFinite(automaticAdjustment.targetMm)
                  ? `${Math.round(automaticAdjustment.targetMm)} mm`
                  : '—'}
              </dd>
            </div>
            <div>
              <dt>automatic move count</dt>
              <dd>{automaticAdjustment.moveCount}</dd>
            </div>
            <div>
              <dt>automatic stable duration</dt>
              <dd>{Math.round(automaticAdjustment.stableDurationMs)} ms</dd>
            </div>
            <div>
              <dt>automatic blocked reason</dt>
              <dd>{automaticAdjustment.blockedReason ?? '—'}</dd>
            </div>
            {armDiagnostics && (
              <>
                <div>
                  <dt>automationEnabled</dt>
                  <dd>{String(armDiagnostics.automationEnabled)}</dd>
                </div>
                <div>
                  <dt>controllerModeIsLocalService</dt>
                  <dd>{String(armDiagnostics.controllerModeIsLocalService)}</dd>
                </div>
                <div>
                  <dt>connected</dt>
                  <dd>{String(armDiagnostics.connected)}</dd>
                </div>
                <div>
                  <dt>positionKnown</dt>
                  <dd>{String(armDiagnostics.positionKnown)}</dd>
                </div>
                <div>
                  <dt>currentPositionAvailable</dt>
                  <dd>{String(armDiagnostics.currentPositionAvailable)}</dd>
                </div>
                <div>
                  <dt>controllerStatus</dt>
                  <dd>{armDiagnostics.controllerStatus ?? '—'}</dd>
                </div>
                <div>
                  <dt>controllerStatusAllowed</dt>
                  <dd>{String(armDiagnostics.controllerStatusAllowed)}</dd>
                </div>
                <div>
                  <dt>noControllerError</dt>
                  <dd>{String(armDiagnostics.noControllerError)}</dd>
                </div>
                <div>
                  <dt>moveCountBelowLimit</dt>
                  <dd>{String(armDiagnostics.moveCountBelowLimit)}</dd>
                </div>
                <div>
                  <dt>automaticStateAllowsArm</dt>
                  <dd>{String(armDiagnostics.automaticStateAllowsArm)}</dd>
                </div>
                <div>
                  <dt>operationNotInProgress</dt>
                  <dd>{String(armDiagnostics.operationNotInProgress)}</dd>
                </div>
                <div>
                  <dt>canArm</dt>
                  <dd>{String(armDiagnostics.canArm)}</dd>
                </div>
                <div>
                  <dt>armBlockedReason</dt>
                  <dd>{armDiagnostics.armBlockedReason ?? '—'}</dd>
                </div>
              </>
            )}
          </>
        )}
      </dl>

      <div className="height-debug-panel__controls">
        {isLocalService && (
          <>
            <button
              type="button"
              disabled={!canArmAutomatic}
              onClick={() => automaticAdjustment.arm()}
            >
              {t('heightAdjustment.debug.armAutomatic')}
            </button>
            <button
              type="button"
              disabled={!canRearmAutomatic}
              onClick={() => automaticAdjustment.rearm()}
            >
              {t('heightAdjustment.debug.rearmAutomatic')}
            </button>
            <button
              type="button"
              disabled={isComplete}
              onClick={() => invoke(onRefreshStatus)}
            >
              {t('heightAdjustment.debug.refreshStatus')}
            </button>
            <button
              type="button"
              disabled={!canStop || isBusy}
              onClick={confirmHome}
            >
              {t('heightAdjustment.debug.home')}
            </button>
            <button
              type="button"
              disabled={!canMove}
              onClick={() => invoke(() => onMoveTo(5))}
            >
              {t('heightAdjustment.debug.to5')}
            </button>
            <button
              type="button"
              disabled={!canMove}
              onClick={() => invoke(() => onMoveTo(10))}
            >
              {t('heightAdjustment.debug.to10')}
            </button>
            <button
              type="button"
              disabled={isComplete}
              onClick={() => invoke(onClearLocalError)}
            >
              {t('heightAdjustment.debug.clearError')}
            </button>
          </>
        )}
        <button
          type="button"
          disabled={isLocalService || isComplete}
          onClick={() => invoke(() => onMoveRelative(10))}
        >
          {t('heightAdjustment.debug.up10')}
        </button>
        <button
          type="button"
          disabled={isLocalService || isComplete}
          onClick={() => invoke(() => onMoveRelative(-10))}
        >
          {t('heightAdjustment.debug.down10')}
        </button>
        <button
          type="button"
          disabled={isLocalService || isComplete}
          onClick={() => invoke(() => onMoveTo(100))}
        >
          {t('heightAdjustment.debug.to100')}
        </button>
        <button
          type="button"
          disabled={isLocalService || isComplete}
          onClick={() => invoke(() => onMoveTo(300))}
        >
          {t('heightAdjustment.debug.to300')}
        </button>
        <button type="button" disabled={!canStop} onClick={() => invoke(onStop)}>
          {t('heightAdjustment.actions.stop')}
        </button>
        <button
          type="button"
          disabled={isLocalService || isComplete}
          onClick={() => invoke(onSimulateError)}
        >
          {t('heightAdjustment.debug.error')}
        </button>
        <button
          type="button"
          disabled={isLocalService || isComplete}
          onClick={() => invoke(onEmergencyStop)}
        >
          {t('heightAdjustment.debug.emergency')}
        </button>
        <button
          type="button"
          disabled={isLocalService || isComplete}
          onClick={() => invoke(onClearEmergencyStop)}
        >
          {t('heightAdjustment.debug.rearm')}
        </button>
        <button type="button" disabled={isLocalService || isComplete} onClick={() => invoke(onReset)}>
          {t('heightAdjustment.debug.reset')}
        </button>
      </div>
    </section>
  )
}

export default HeightAdjustmentDebugPanel
