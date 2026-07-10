import heightAdjustmentConfig from '../config/heightAdjustmentConfig.js'
import {
  createHeightControllerError,
  createHeightControllerState,
  heightControllerStatuses,
} from './heightControllerState.js'

const defaultClock = {
  now: () => Date.now(),
  setInterval: (...arguments_) => window.setInterval(...arguments_),
  clearInterval: (timer) => window.clearInterval(timer),
  setTimeout: (...arguments_) => window.setTimeout(...arguments_),
  clearTimeout: (timer) => window.clearTimeout(timer),
}

function createSimulatedHeightController({
  config = heightAdjustmentConfig,
  clock = defaultClock,
} = {}) {
  let state = createHeightControllerState(config)
  let destroyed = false
  let movementInterval = null
  let movementTimeout = null
  let movementPromise = null
  let resolveMovement = null
  let rejectMovement = null
  let lastMovementUpdateAt = null
  const listeners = new Set()

  const getStatus = () => ({ ...state })

  const emit = () => {
    const snapshot = getStatus()
    listeners.forEach((listener) => listener(snapshot))
  }

  const updateState = (patch) => {
    state = createHeightControllerState(config, {
      ...state,
      ...patch,
      updatedAt: clock.now(),
    })
    emit()
  }

  const assertAlive = () => {
    if (destroyed) {
      throw createHeightControllerError('CONTROLLER_DESTROYED')
    }
  }

  const clearMovementTimers = () => {
    if (movementInterval !== null) {
      clock.clearInterval(movementInterval)
      movementInterval = null
    }

    if (movementTimeout !== null) {
      clock.clearTimeout(movementTimeout)
      movementTimeout = null
    }
  }

  const settleMovementPromise = (error = null) => {
    const resolve = resolveMovement
    const reject = rejectMovement
    movementPromise = null
    resolveMovement = null
    rejectMovement = null

    if (error) {
      reject?.(error)
    } else {
      resolve?.(getStatus())
    }
  }

  const interruptMovement = (code) => {
    if (!movementPromise) {
      clearMovementTimers()
      return
    }

    clearMovementTimers()
    settleMovementPromise(createHeightControllerError(code))
  }

  const assertCanMove = () => {
    assertAlive()

    if (!state.connected) {
      throw createHeightControllerError('CONTROLLER_DISCONNECTED')
    }

    if (state.emergencyStopActive) {
      throw createHeightControllerError('EMERGENCY_STOP_ACTIVE')
    }

    if (state.status === heightControllerStatuses.error) {
      throw createHeightControllerError('CONTROLLER_ERROR')
    }

    if (movementPromise) {
      throw createHeightControllerError('COMMAND_IN_PROGRESS')
    }
  }

  const connect = async () => {
    assertAlive()

    if (!state.connected) {
      updateState({
        connected: true,
        status: heightControllerStatuses.idle,
        error: null,
      })
    }

    return getStatus()
  }

  const disconnect = async () => {
    assertAlive()
    interruptMovement('CONTROLLER_DISCONNECTED')
    updateState({
      connected: false,
      status: heightControllerStatuses.disconnected,
      targetPositionMm: null,
    })
    return getStatus()
  }

  const moveToMm = (positionMm) => {
    assertCanMove()

    if (
      !Number.isFinite(positionMm) ||
      positionMm < config.minPositionMm ||
      positionMm > config.maxPositionMm
    ) {
      throw createHeightControllerError('TARGET_OUT_OF_RANGE')
    }

    if (positionMm === state.currentPositionMm) {
      updateState({
        status: heightControllerStatuses.idle,
        targetPositionMm: positionMm,
      })
      return Promise.resolve(getStatus())
    }

    const direction = positionMm > state.currentPositionMm ? 1 : -1
    lastMovementUpdateAt = clock.now()
    updateState({
      status:
        direction > 0
          ? heightControllerStatuses.movingUp
          : heightControllerStatuses.movingDown,
      targetPositionMm: positionMm,
      error: null,
    })

    movementPromise = new Promise((resolve, reject) => {
      resolveMovement = resolve
      rejectMovement = reject
    })

    movementInterval = clock.setInterval(() => {
      if (destroyed || !movementPromise) {
        return
      }

      const now = clock.now()
      const elapsedSeconds = Math.max(
        0,
        now - lastMovementUpdateAt,
      ) / 1000
      lastMovementUpdateAt = now
      const movement =
        config.simulationSpeedMmPerSecond * elapsedSeconds
      const candidatePosition =
        state.currentPositionMm + direction * movement
      const reachedTarget =
        direction > 0
          ? candidatePosition >= positionMm
          : candidatePosition <= positionMm
      const currentPositionMm = reachedTarget
        ? positionMm
        : Math.min(
            config.maxPositionMm,
            Math.max(config.minPositionMm, candidatePosition),
          )

      updateState({
        currentPositionMm,
        upperLimitReached:
          currentPositionMm >= config.maxPositionMm,
        lowerLimitReached:
          currentPositionMm <= config.minPositionMm,
      })

      if (reachedTarget) {
        clearMovementTimers()
        updateState({
          status: heightControllerStatuses.idle,
          currentPositionMm: positionMm,
          targetPositionMm: positionMm,
        })
        settleMovementPromise()
      }
    }, config.updateIntervalMs)

    movementTimeout = clock.setTimeout(() => {
      if (!movementPromise) {
        return
      }

      clearMovementTimers()
      updateState({
        status: heightControllerStatuses.error,
        targetPositionMm: null,
        error: 'MOVEMENT_TIMEOUT',
      })
      settleMovementPromise(
        createHeightControllerError('MOVEMENT_TIMEOUT'),
      )
    }, config.maximumMovementDurationMs)

    return movementPromise
  }

  const moveRelativeMm = (deltaMm) => {
    if (!Number.isFinite(deltaMm)) {
      throw createHeightControllerError('INVALID_MOVEMENT_DELTA')
    }

    return moveToMm(state.currentPositionMm + deltaMm)
  }

  const stop = () => {
    assertAlive()
    interruptMovement('MOVEMENT_STOPPED')
    updateState({
      status: heightControllerStatuses.stopped,
      targetPositionMm: null,
    })
    return getStatus()
  }

  const emergencyStop = () => {
    assertAlive()
    interruptMovement('EMERGENCY_STOP_ACTIVE')
    updateState({
      status: heightControllerStatuses.emergencyStop,
      targetPositionMm: null,
      emergencyStopActive: true,
    })
    return getStatus()
  }

  const clearEmergencyStop = () => {
    assertAlive()

    if (!state.emergencyStopActive) {
      return getStatus()
    }

    updateState({
      status: state.connected
        ? heightControllerStatuses.stopped
        : heightControllerStatuses.disconnected,
      emergencyStopActive: false,
    })
    return getStatus()
  }

  const reset = () => {
    assertAlive()

    if (state.emergencyStopActive) {
      throw createHeightControllerError('EMERGENCY_STOP_ACTIVE')
    }

    interruptMovement('CONTROLLER_RESET')
    state = createHeightControllerState(config, {
      connected: state.connected,
      status: state.connected
        ? heightControllerStatuses.idle
        : heightControllerStatuses.disconnected,
      updatedAt: clock.now(),
    })
    emit()
    return getStatus()
  }

  const simulateError = (errorCode = 'SIMULATED_ERROR') => {
    assertAlive()
    interruptMovement(errorCode)
    updateState({
      status: heightControllerStatuses.error,
      targetPositionMm: null,
      error: errorCode,
    })
    return getStatus()
  }

  const subscribe = (listener) => {
    assertAlive()
    listeners.add(listener)
    listener(getStatus())
    return () => listeners.delete(listener)
  }

  const destroy = () => {
    if (destroyed) {
      return
    }

    interruptMovement('CONTROLLER_DESTROYED')
    destroyed = true
    listeners.clear()
    state = createHeightControllerState(config, {
      ...state,
      connected: false,
      status: heightControllerStatuses.disconnected,
      targetPositionMm: null,
      updatedAt: clock.now(),
    })
  }

  return {
    mode: 'simulation',
    clearEmergencyStop,
    connect,
    destroy,
    disconnect,
    emergencyStop,
    getStatus,
    moveRelativeMm,
    moveToMm,
    reset,
    simulateError,
    stop,
    subscribe,
  }
}

export { defaultClock }
export default createSimulatedHeightController
