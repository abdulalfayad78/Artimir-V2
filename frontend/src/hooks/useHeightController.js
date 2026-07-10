import { useEffect, useRef, useState } from 'react'
import heightAdjustmentConfig from '../config/heightAdjustmentConfig.js'
import createHeightAdjustmentOrchestrator from '../height/createHeightAdjustmentOrchestrator.js'
import createHeightController from '../height/createHeightController.js'
import { shouldNavigateAfterHeightAdjustment } from '../height/heightAdjustmentNavigation.js'
import { createHeightControllerState } from '../height/heightControllerState.js'

function useHeightController({
  config = heightAdjustmentConfig,
  onComplete,
} = {}) {
  const onCompleteRef = useRef(onComplete)
  const orchestratorRef = useRef(null)
  const completionTimerRef = useRef(null)

  onCompleteRef.current = onComplete

  const [state, setState] = useState(() =>
    createHeightControllerState(config),
  )

  useEffect(() => {
    const controller = createHeightController({ config })
    const orchestrator = createHeightAdjustmentOrchestrator({
      controller,
      config,
    })
    orchestratorRef.current = orchestrator
    const unsubscribe = orchestrator.subscribe(setState)
    let active = true

    orchestrator
      .connect()
      .then(() => {
        if (active && config.controllerMode === 'simulation') {
          return orchestrator.startAutomaticAdjustment()
        }

        return null
      })
      .catch(() => {
        // Controller and orchestrator states expose the error to the UI.
      })

    return () => {
      active = false
      unsubscribe()
      orchestrator.destroy()
      if (orchestratorRef.current === orchestrator) {
        orchestratorRef.current = null
      }
    }
  }, [config])

  useEffect(() => {
    if (
      config.controllerMode !== 'simulation' ||
      !shouldNavigateAfterHeightAdjustment(state.status)
    ) {
      if (completionTimerRef.current !== null) {
        window.clearTimeout(completionTimerRef.current)
        completionTimerRef.current = null
      }
      return undefined
    }

    completionTimerRef.current = window.setTimeout(() => {
      completionTimerRef.current = null
      Promise.resolve(onCompleteRef.current?.()).catch(() => {})
    }, config.completionNavigationDelayMs)

    return () => {
      if (completionTimerRef.current !== null) {
        window.clearTimeout(completionTimerRef.current)
        completionTimerRef.current = null
      }
    }
  }, [
    config.completionNavigationDelayMs,
    config.controllerMode,
    state.status,
  ])

  const getOrchestrator = () => orchestratorRef.current

  return {
    state,
    clearEmergencyStop: () =>
      getOrchestrator()?.clearEmergencyStop(),
    emergencyStop: () => getOrchestrator()?.emergencyStop(),
    home: () => getOrchestrator()?.home(),
    moveRelativeMm: (deltaMm) =>
      getOrchestrator()?.moveRelativeMm(deltaMm),
    moveToMm: (positionMm) =>
      getOrchestrator()?.moveToMm(positionMm),
    reset: () => getOrchestrator()?.reset(),
    refreshStatus: () => getOrchestrator()?.refreshStatus(),
    clearLocalError: () => getOrchestrator()?.clearLocalError(),
    simulateError: (errorCode) =>
      getOrchestrator()?.simulateError(errorCode),
    stop: () => getOrchestrator()?.stop(),
  }
}

export default useHeightController
