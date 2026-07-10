const heightControllerStatuses = Object.freeze({
  disconnected: 'disconnected',
  idle: 'idle',
  measuring: 'measuring',
  movingUp: 'moving_up',
  movingDown: 'moving_down',
  homing: 'homing',
  settling: 'settling',
  verifying: 'verifying',
  complete: 'complete',
  stopped: 'stopped',
  error: 'error',
  emergencyStop: 'emergency_stop',
})

const allowedHeightControllerStatuses = new Set(
  Object.values(heightControllerStatuses),
)

function createHeightControllerState(config, overrides = {}) {
  const state = {
    mode: config.controllerMode,
    connected: false,
    status: heightControllerStatuses.disconnected,
    currentPositionMm: config.initialPositionMm,
    positionKnown: true,
    targetPositionMm: null,
    minPositionMm: config.minPositionMm,
    maxPositionMm: config.maxPositionMm,
    upperLimitReached:
      config.initialPositionMm >= config.maxPositionMm,
    lowerLimitReached:
      config.initialPositionMm <= config.minPositionMm,
    emergencyStopActive: false,
    error: null,
    lastError: null,
    updatedAt: 0,
    ...overrides,
  }

  if (!allowedHeightControllerStatuses.has(state.status)) {
    throw new Error(`Invalid height controller status: ${state.status}`)
  }

  return state
}

function createHeightControllerError(code, message = code) {
  const error = new Error(message)
  error.code = code
  return error
}

export {
  allowedHeightControllerStatuses,
  createHeightControllerError,
  createHeightControllerState,
  heightControllerStatuses,
}
