import { getMotorServiceUrl } from '../realtime/runtimeUrls.js'

const allowedControllerModes = new Set(['simulation', 'localService'])
const viteEnvironment = import.meta.env ?? {}

const requestedControllerMode =
  viteEnvironment.VITE_HEIGHT_CONTROLLER_MODE ?? 'simulation'

const controllerMode = allowedControllerModes.has(requestedControllerMode)
  ? requestedControllerMode
  : 'simulation'
const automaticHeightAdjustmentEnabled =
  viteEnvironment.VITE_AUTOMATIC_HEIGHT_ADJUSTMENT === 'true'

const heightAdjustmentConfig = Object.freeze({
  controllerMode,
  automaticHeightAdjustmentEnabled,
  automaticHeightStepMm: 5,
  automaticHeightStableDurationMs: 1000,
  automaticHeightMinimumSamples: 10,
  automaticHeightCooldownMs: 1500,
  automaticHeightMaximumMovesPerCycle: 1,
  motorServiceUrl: getMotorServiceUrl({ env: viteEnvironment }),
  motorServiceRequestTimeoutMs: 2500,
  motorServicePollIntervalMs: 1000,
  minPositionMm: 0,
  maxPositionMm: 500,
  initialPositionMm: 250,
  /*
   * Demonstration-only target. It is not a measurement of the visitor
   * and will later be replaced by the camera positioning service.
   */
  simulationTargetPositionMm: 300,
  /*
   * Temporary unloaded simulation speed. The real speed must be
   * calibrated with the final actuator carrying Artimir's full load.
   */
  simulationSpeedMmPerSecond: 14,
  updateIntervalMs: 50,
  measuringDurationMs: 700,
  settlingDurationMs: 800,
  verificationDurationMs: 1000,
  completionNavigationDelayMs: 1000,
  maximumMovementDurationMs: 45000,
  movementStepLargeMm: 20,
  movementStepMediumMm: 10,
  movementStepSmallMm: 5,
})

export default heightAdjustmentConfig
