import heightAdjustmentConfig from '../config/heightAdjustmentConfig.js'
import { defaultClock } from './createSimulatedHeightController.js'
import {
  createHeightControllerError,
  heightControllerStatuses,
} from './heightControllerState.js'

function createHeightAdjustmentOrchestrator({
  controller,
  config = heightAdjustmentConfig,
  clock = defaultClock,
} = {}) {
  let phase = null
  let destroyed = false
  let automaticRun = null
  let phaseTimer = null
  let rejectPhaseWait = null
  let controllerState = controller.getStatus()
  const listeners = new Set()

  const getStatus = () => ({
    ...controllerState,
    status: phase ?? controllerState.status,
  })

  const emit = () => {
    const snapshot = getStatus()
    listeners.forEach((listener) => listener(snapshot))
  }

  const setPhase = (nextPhase) => {
    phase = nextPhase
    emit()
  }

  const clearPhaseTimer = (reason = 'ORCHESTRATION_CANCELLED') => {
    if (phaseTimer !== null) {
      clock.clearTimeout(phaseTimer)
      phaseTimer = null
    }

    if (rejectPhaseWait) {
      const reject = rejectPhaseWait
      rejectPhaseWait = null
      reject(createHeightControllerError(reason))
    }
  }

  const waitForPhase = (durationMs) =>
    new Promise((resolve, reject) => {
      rejectPhaseWait = reject
      phaseTimer = clock.setTimeout(() => {
        phaseTimer = null
        rejectPhaseWait = null
        resolve()
      }, durationMs)
    })

  const unsubscribeController = controller.subscribe((nextState) => {
    controllerState = nextState
    emit()
  })

  const assertAvailable = () => {
    if (destroyed) {
      throw createHeightControllerError('ORCHESTRATOR_DESTROYED')
    }
  }

  const assertNoAutomaticRun = () => {
    assertAvailable()

    if (automaticRun) {
      throw createHeightControllerError('COMMAND_IN_PROGRESS')
    }
  }

  const connect = async () => {
    assertAvailable()
    await controller.connect()
    return getStatus()
  }

  const startAutomaticAdjustment = () => {
    assertNoAutomaticRun()

    if (controller.mode !== 'simulation') {
      return Promise.resolve(getStatus())
    }

    automaticRun = (async () => {
      try {
        setPhase(heightControllerStatuses.measuring)
        await waitForPhase(config.measuringDurationMs)

        const movement = controller.moveToMm(
          config.simulationTargetPositionMm,
        )
        phase = null
        emit()
        await movement

        setPhase(heightControllerStatuses.settling)
        await waitForPhase(config.settlingDurationMs)
        setPhase(heightControllerStatuses.verifying)
        await waitForPhase(config.verificationDurationMs)
        setPhase(heightControllerStatuses.complete)
        return getStatus()
      } catch (error) {
        phase = null
        emit()
        throw error
      } finally {
        automaticRun = null
      }
    })()

    return automaticRun
  }

  const runManualCommand = async (command) => {
    assertNoAutomaticRun()
    phase = null
    emit()
    return command()
  }

  const moveToMm = (positionMm) =>
    runManualCommand(() => controller.moveToMm(positionMm))
  const moveRelativeMm = (deltaMm) =>
    runManualCommand(() =>
      controller.moveRelativeMm(deltaMm),
    )

  const stop = () => {
    assertAvailable()
    clearPhaseTimer('MOVEMENT_STOPPED')
    phase = null
    return controller.stop()
  }

  const home = () => runManualCommand(() => controller.home())
  const refreshStatus = () =>
    runManualCommand(() => controller.refreshStatus())
  const clearLocalError = () => {
    assertAvailable()
    phase = null
    return controller.clearLocalError?.() ?? controller.reset()
  }

  const emergencyStop = () => {
    assertAvailable()
    clearPhaseTimer('EMERGENCY_STOP_ACTIVE')
    phase = null
    return controller.emergencyStop()
  }

  const clearEmergencyStop = () => {
    assertAvailable()
    phase = null
    return controller.clearEmergencyStop()
  }

  const reset = () => {
    assertAvailable()
    clearPhaseTimer('CONTROLLER_RESET')
    phase = null
    return controller.reset()
  }

  const simulateError = (errorCode) => {
    assertAvailable()
    clearPhaseTimer(errorCode)
    phase = null
    return controller.simulateError(errorCode)
  }

  const subscribe = (listener) => {
    assertAvailable()
    listeners.add(listener)
    listener(getStatus())
    return () => listeners.delete(listener)
  }

  const destroy = () => {
    if (destroyed) {
      return
    }

    clearPhaseTimer('ORCHESTRATOR_DESTROYED')
    destroyed = true
    automaticRun?.catch(() => {})
    automaticRun = null
    unsubscribeController()
    listeners.clear()
    controller.destroy()
  }

  return {
    clearEmergencyStop,
    connect,
    destroy,
    emergencyStop,
    getStatus,
    home,
    moveRelativeMm,
    moveToMm,
    refreshStatus,
    reset,
    clearLocalError,
    simulateError,
    startAutomaticAdjustment,
    stop,
    subscribe,
  }
}

export default createHeightAdjustmentOrchestrator
