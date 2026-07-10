import heightAdjustmentConfig from '../config/heightAdjustmentConfig.js'
import createLocalServiceHeightController from './createLocalServiceHeightController.js'
import createSimulatedHeightController from './createSimulatedHeightController.js'
import {
  createHeightControllerError,
  createHeightControllerState,
} from './heightControllerState.js'

function createUnavailableHardwareController(config) {
  const unavailable = () => {
    throw createHeightControllerError('HARDWARE_NOT_IMPLEMENTED')
  }
  const unavailableAsync = async () => unavailable()

  return {
    mode: 'hardware',
    clearEmergencyStop: unavailable,
    connect: unavailableAsync,
    destroy: () => {},
    disconnect: unavailableAsync,
    emergencyStop: unavailable,
    getStatus: () =>
      createHeightControllerState(config, {
        mode: 'hardware',
        error: 'HARDWARE_NOT_IMPLEMENTED',
      }),
    moveRelativeMm: unavailableAsync,
    moveToMm: unavailableAsync,
    reset: unavailable,
    simulateError: unavailable,
    stop: unavailable,
    subscribe: (listener) => {
      listener(
        createHeightControllerState(config, {
          mode: 'hardware',
          error: 'HARDWARE_NOT_IMPLEMENTED',
        }),
      )
      return () => {}
    },
  }
}

function createHeightController({
  config = heightAdjustmentConfig,
  clock,
} = {}) {
  if (config.controllerMode === 'simulation') {
    return createSimulatedHeightController({ config, clock })
  }

  if (config.controllerMode === 'localService') {
    return createLocalServiceHeightController({ config })
  }

  if (config.controllerMode === 'hardware') {
    return createUnavailableHardwareController(config)
  }

  throw createHeightControllerError('UNKNOWN_CONTROLLER_MODE')
}

export { createUnavailableHardwareController }
export default createHeightController
