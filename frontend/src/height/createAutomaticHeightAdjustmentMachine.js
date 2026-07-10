import heightAdjustmentConfig from '../config/heightAdjustmentConfig.js'
import { heightRecommendations } from '../detection/heightObservation.js'
import { heightControllerStatuses } from './heightControllerState.js'

const automaticHeightStates = Object.freeze({
  disabled: 'disabled',
  observingUnarmed: 'observing_unarmed',
  observing: 'observing',
  armed: 'armed',
  movingOnce: 'moving_once',
  waitingForSettle: 'waiting_for_settle',
  remeasuring: 'remeasuring',
  completedOnce: 'completed_once',
  blocked: 'blocked',
  error: 'error',
})

const allowedStartStatuses = new Set([
  heightControllerStatuses.idle,
  heightControllerStatuses.stopped,
])

const armAllowedStates = new Set([
  automaticHeightStates.observingUnarmed,
  automaticHeightStates.observing,
])

const rearmAllowedStates = new Set([
  automaticHeightStates.completedOnce,
  automaticHeightStates.blocked,
  automaticHeightStates.error,
])

const movementRecommendations = new Set([
  heightRecommendations.artimirShouldMoveUp,
  heightRecommendations.artimirShouldMoveDown,
])

const defaultClock = Object.freeze({
  clearTimeout: (id) => window.clearTimeout(id),
  now: () => performance.now(),
  setTimeout: (callback, delay) => window.setTimeout(callback, delay),
})

function isFiniteNumber(value) {
  return Number.isFinite(value)
}

function createSnapshot({
  armed = false,
  armDiagnostics = null,
  automaticState,
  blockedReason = null,
  enabled,
  moveCount = 0,
  operationToken = 0,
  recommendation = null,
  stableDurationMs = 0,
  targetMm = null,
} = {}) {
  return {
    armed,
    armDiagnostics,
    automaticState,
    blockedReason,
    enabled,
    moveCount,
    operationToken,
    recommendation,
    stableDurationMs,
    targetMm,
  }
}

function getArmDiagnostics({
  automaticState,
  config,
  controllerState,
  moveCount,
  movementReserved,
}) {
  const automationEnabled =
    config.automaticHeightAdjustmentEnabled === true
  const controllerModeIsLocalService =
    controllerState.mode === 'localService'
  const connected = controllerState.connected === true
  const positionKnown = controllerState.positionKnown === true
  const currentPositionAvailable = isFiniteNumber(
    controllerState.currentPositionMm,
  )
  const controllerStatus = controllerState.status
  const controllerStatusAllowed =
    allowedStartStatuses.has(controllerStatus)
  const noControllerError = Boolean(
    !controllerState.error && !controllerState.lastError,
  )
  const moveCountBelowLimit =
    moveCount < config.automaticHeightMaximumMovesPerCycle
  const automaticStateAllowsArm =
    armAllowedStates.has(automaticState)
  const operationNotInProgress = !movementReserved
  const conditions = {
    automationEnabled,
    automaticStateAllowsArm,
    connected,
    controllerModeIsLocalService,
    controllerStatusAllowed,
    currentPositionAvailable,
    moveCountBelowLimit,
    noControllerError,
    operationNotInProgress,
    positionKnown,
  }
  const armBlockedReason =
    Object.entries(conditions).find(([, valid]) => !valid)?.[0] ??
    null

  return {
    ...conditions,
    armBlockedReason,
    canArm: armBlockedReason === null,
    controllerStatus,
  }
}

function getControllerBlockReason(controllerState) {
  if (controllerState.mode !== 'localService') {
    return 'not_local_service'
  }

  if (!controllerState.connected) {
    return 'service_disconnected'
  }

  if (!controllerState.positionKnown) {
    return 'position_unknown'
  }

  if (!isFiniteNumber(controllerState.currentPositionMm)) {
    return 'position_unavailable'
  }

  if (controllerState.error || controllerState.lastError) {
    return 'motor_error'
  }

  if (!allowedStartStatuses.has(controllerState.status)) {
    return 'motor_not_stopped'
  }

  return null
}

function getMovingControllerBlockReason(controllerState) {
  if (!controllerState.connected) {
    return 'service_disconnected'
  }

  if (controllerState.error || controllerState.lastError) {
    return 'motor_error'
  }

  if (
    controllerState.status === heightControllerStatuses.error ||
    controllerState.status === heightControllerStatuses.disconnected ||
    controllerState.status === heightControllerStatuses.homing
  ) {
    return 'motor_invalid_state'
  }

  return null
}

function getCameraValidityBlockReason(observation, now) {
  if (!observation.faceValid) {
    return 'face_not_valid'
  }

  if (!observation.stable) {
    return 'face_unstable'
  }

  if (!observation.eyeCenterMethod) {
    return 'eyes_unavailable'
  }

  if (
    !isFiniteNumber(observation.dataAgeMs) ||
    observation.dataAgeMs >= 200
  ) {
    return 'camera_data_stale'
  }

  if (
    isFiniteNumber(observation.updatedAt) &&
    now - observation.updatedAt >= 200
  ) {
    return 'camera_data_stale'
  }

  if (observation.reason) {
    return observation.reason
  }

  return null
}

function getObservationBlockReason(observation, now) {
  if (!movementRecommendations.has(
    observation.displayedHeightRecommendation,
  )) {
    return 'recommendation_not_movement'
  }

  return getCameraValidityBlockReason(observation, now)
}

function calculateTargetMm({
  config,
  currentPositionMm,
  recommendation,
}) {
  const delta =
    recommendation === heightRecommendations.artimirShouldMoveUp
      ? config.automaticHeightStepMm
      : -config.automaticHeightStepMm
  const targetMm = currentPositionMm + delta

  if (targetMm < config.minPositionMm) {
    return { blockedReason: 'lower_limit_reached', targetMm }
  }

  if (targetMm > config.maxPositionMm) {
    return { blockedReason: 'upper_limit_reached', targetMm }
  }

  return { blockedReason: null, targetMm }
}

function createAutomaticHeightAdjustmentMachine({
  config = heightAdjustmentConfig,
  clock = defaultClock,
  moveToMm,
  stop,
} = {}) {
  let armed = false
  let moveCount = 0
  let automaticState = config.automaticHeightAdjustmentEnabled
    ? automaticHeightStates.observingUnarmed
    : automaticHeightStates.disabled
  let blockedReason = null
  let stableRecommendation = null
  let stableRecommendationSince = null
  let stableDurationMs = 0
  let targetMm = null
  let movementReserved = false
  let stopRequestedForCurrentMove = false
  let operationToken = 0
  let cooldownTimer = null
  let settleFinishedAt = null
  let postMoveSamples = 0
  let lastControllerState = {
    connected: false,
    currentPositionMm: null,
    error: null,
    lastError: null,
    mode: config.controllerMode,
    positionKnown: false,
    status: heightControllerStatuses.disconnected,
  }
  const listeners = new Set()

  const getSnapshot = () =>
    createSnapshot({
      armed,
      armDiagnostics: getArmDiagnostics({
        automaticState,
        config,
        controllerState: lastControllerState,
        moveCount,
        movementReserved,
      }),
      automaticState,
      blockedReason,
      enabled: config.automaticHeightAdjustmentEnabled,
      moveCount,
      operationToken,
      recommendation: stableRecommendation,
      stableDurationMs,
      targetMm,
    })

  const emit = () => {
    const snapshot = getSnapshot()
    listeners.forEach((listener) => listener(snapshot))
  }

  const clearCooldown = () => {
    if (cooldownTimer !== null) {
      clock.clearTimeout(cooldownTimer)
      cooldownTimer = null
    }
  }

  const setState = (nextState, reason = null) => {
    automaticState = nextState
    blockedReason = reason
    emit()
  }

  const disarm = () => {
    armed = false
    stableRecommendation = null
    stableRecommendationSince = null
    stableDurationMs = 0
  }

  const arm = (controllerState) => {
    lastControllerState = controllerState
    const armDiagnostics = getArmDiagnostics({
      automaticState,
      config,
      controllerState,
      moveCount,
      movementReserved,
    })

    if (!armDiagnostics.canArm) {
      setState(
        armDiagnostics.automationEnabled
          ? automaticState
          : automaticHeightStates.disabled,
        armDiagnostics.armBlockedReason,
      )
      return getSnapshot()
    }

    if (!config.automaticHeightAdjustmentEnabled) {
      setState(automaticHeightStates.disabled, 'feature_disabled')
      return getSnapshot()
    }

    if (moveCount >= config.automaticHeightMaximumMovesPerCycle) {
      setState(
        automaticHeightStates.completedOnce,
        'move_already_completed',
      )
      return getSnapshot()
    }

    const reason = getControllerBlockReason(controllerState)

    if (reason) {
      setState(automaticHeightStates.blocked, reason)
      return getSnapshot()
    }

    armed = true
    setState(automaticHeightStates.observing)
    return getSnapshot()
  }

  const rearm = (controllerState) => {
    if (!rearmAllowedStates.has(automaticState)) {
      setState(automaticState, 'rearm_not_available')
      return getSnapshot()
    }

    clearCooldown()
    moveCount = 0
    movementReserved = false
    stopRequestedForCurrentMove = false
    operationToken += 1
    targetMm = null
    settleFinishedAt = null
    postMoveSamples = 0
    disarm()
    automaticState = automaticHeightStates.observingUnarmed
    return arm(controllerState)
  }

  const resetRecommendationWindow = () => {
    stableRecommendation = null
    stableRecommendationSince = null
    stableDurationMs = 0
  }

  const requestStopOnce = () => {
    if (stopRequestedForCurrentMove || typeof stop !== 'function') {
      return
    }

    stopRequestedForCurrentMove = true
    Promise.resolve(stop()).catch(() => {})
  }

  const handleMoveResolved = (token) => {
    if (
      token !== operationToken ||
      automaticState !== automaticHeightStates.movingOnce ||
      stopRequestedForCurrentMove
    ) {
      return
    }

    setState(automaticHeightStates.waitingForSettle)
    clearCooldown()
    cooldownTimer = clock.setTimeout(() => {
      if (token !== operationToken) {
        return
      }

      cooldownTimer = null
      settleFinishedAt = clock.now()
      postMoveSamples = 0
      setState(automaticHeightStates.remeasuring)
    }, config.automaticHeightCooldownMs)
  }

  const handleMoveRejected = (token, error) => {
    if (token !== operationToken) {
      return
    }

    disarm()
    setState(
      automaticHeightStates.error,
      error?.code ?? 'automatic_move_failed',
    )
  }

  const startMove = (controllerState, observation, now) => {
    if (movementReserved) {
      return
    }

    const controllerReason = getControllerBlockReason(controllerState)
    const observationReason = getObservationBlockReason(observation, now)

    if (controllerReason || observationReason) {
      setState(
        automaticHeightStates.observing,
        controllerReason ?? observationReason,
      )
      return
    }

    const target = calculateTargetMm({
      config,
      currentPositionMm: controllerState.currentPositionMm,
      recommendation: observation.displayedHeightRecommendation,
    })

    if (target.blockedReason) {
      disarm()
      setState(automaticHeightStates.blocked, target.blockedReason)
      return
    }

    /*
     * StrictMode/lifecycle latch: reserve the only movement synchronously
     * before the HTTP command can be sent.
     */
    movementReserved = true
    moveCount += 1
    targetMm = target.targetMm
    operationToken += 1
    stopRequestedForCurrentMove = false
    const token = operationToken
    disarm()
    setState(automaticHeightStates.movingOnce)

    Promise.resolve(moveToMm(targetMm))
      .then(() => handleMoveResolved(token))
      .catch((error) => handleMoveRejected(token, error))
  }

  const updateRecommendationWindow = (observation, now) => {
    const recommendation = observation.displayedHeightRecommendation

    if (!movementRecommendations.has(recommendation)) {
      resetRecommendationWindow()
      return
    }

    if (stableRecommendation !== recommendation) {
      stableRecommendation = recommendation
      stableRecommendationSince = now
      stableDurationMs = 0
      return
    }

    stableDurationMs = now - stableRecommendationSince
  }

  const evaluate = ({
    controllerState,
    observation,
    now = clock.now(),
  }) => {
    lastControllerState = controllerState

    if (!config.automaticHeightAdjustmentEnabled) {
      setState(automaticHeightStates.disabled, 'feature_disabled')
      return getSnapshot()
    }

    if (
      automaticState === automaticHeightStates.movingOnce &&
      (getMovingControllerBlockReason(controllerState) ||
        getCameraValidityBlockReason(observation, now))
    ) {
      requestStopOnce()
      operationToken += 1
      disarm()
      setState(automaticHeightStates.blocked, 'safety_stop')
      return getSnapshot()
    }

    if (automaticState === automaticHeightStates.waitingForSettle) {
      return getSnapshot()
    }

    if (automaticState === automaticHeightStates.remeasuring) {
      if (
        observation.updatedAt > settleFinishedAt &&
        !getCameraValidityBlockReason(observation, now)
      ) {
        postMoveSamples += 1
      }

      if (postMoveSamples >= config.automaticHeightMinimumSamples) {
        setState(automaticHeightStates.completedOnce)
      }

      return getSnapshot()
    }

    if (
      automaticState === automaticHeightStates.completedOnce ||
      automaticState === automaticHeightStates.blocked ||
      automaticState === automaticHeightStates.error
    ) {
      return getSnapshot()
    }

    if (!armed) {
      setState(automaticHeightStates.observingUnarmed)
      return getSnapshot()
    }

    const controllerReason = getControllerBlockReason(controllerState)
    const observationReason = getObservationBlockReason(observation, now)

    if (controllerReason || observationReason) {
      resetRecommendationWindow()
      setState(
        automaticHeightStates.observing,
        controllerReason ?? observationReason,
      )
      return getSnapshot()
    }

    updateRecommendationWindow(observation, now)

    const hasEnoughStableRecommendation =
      stableDurationMs >= config.automaticHeightStableDurationMs &&
      observation.stableSampleCount >=
        config.automaticHeightMinimumSamples

    if (!hasEnoughStableRecommendation) {
      setState(automaticHeightStates.observing)
      return getSnapshot()
    }

    setState(automaticHeightStates.armed)
    startMove(controllerState, observation, now)
    return getSnapshot()
  }

  const stopAutomation = () => {
    clearCooldown()
    operationToken += 1
    if (automaticState === automaticHeightStates.movingOnce) {
      requestStopOnce()
    }
    disarm()
    setState(automaticHeightStates.blocked, 'manual_stop')
  }

  const destroy = () => {
    clearCooldown()
    if (automaticState === automaticHeightStates.movingOnce) {
      requestStopOnce()
    }
    listeners.clear()
    operationToken += 1
    disarm()
  }

  const subscribe = (listener) => {
    listeners.add(listener)
    listener(getSnapshot())
    return () => listeners.delete(listener)
  }

  return {
    arm,
    destroy,
    evaluate,
    getSnapshot,
    rearm,
    stopAutomation,
    subscribe,
  }
}

export {
  allowedStartStatuses,
  armAllowedStates,
  automaticHeightStates,
  calculateTargetMm,
  createAutomaticHeightAdjustmentMachine,
  getArmDiagnostics,
  getControllerBlockReason,
  getCameraValidityBlockReason,
  getMovingControllerBlockReason,
  getObservationBlockReason,
}
