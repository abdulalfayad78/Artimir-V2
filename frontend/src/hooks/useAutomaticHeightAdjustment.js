import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import heightAdjustmentConfig from '../config/heightAdjustmentConfig.js'
import {
  automaticHeightStates,
  createAutomaticHeightAdjustmentMachine,
} from '../height/createAutomaticHeightAdjustmentMachine.js'

function useAutomaticHeightAdjustment({
  config = heightAdjustmentConfig,
  controllerState,
  moveToMm,
  observation,
  stop,
} = {}) {
  const moveToMmRef = useRef(moveToMm)
  const stopRef = useRef(stop)

  moveToMmRef.current = moveToMm
  stopRef.current = stop

  const moveToMmProxy = useCallback(
    (targetMm) => moveToMmRef.current?.(targetMm),
    [],
  )
  const stopProxy = useCallback(
    () => stopRef.current?.(),
    [],
  )
  const machine = useMemo(
    () =>
      createAutomaticHeightAdjustmentMachine({
        config,
        moveToMm: moveToMmProxy,
        stop: stopProxy,
      }),
    [config, moveToMmProxy, stopProxy],
  )
  const [state, setState] = useState(() => machine.getSnapshot())

  useEffect(() => machine.subscribe(setState), [machine])

  useEffect(() => {
    machine.evaluate({
      controllerState,
      observation,
    })
  }, [controllerState, machine, observation])

  useEffect(() => {
    const timer = window.setInterval(() => {
      machine.evaluate({
        controllerState,
        observation,
      })
    }, 100)

    return () => {
      window.clearInterval(timer)
    }
  }, [controllerState, machine, observation])

  useEffect(
    () => () => {
      machine.destroy()
    },
    [machine],
  )

  return {
    ...state,
    arm: () => machine.arm(controllerState),
    isMovingAutomatically:
      state.automaticState === automaticHeightStates.movingOnce,
    rearm: () => machine.rearm(controllerState),
    stopAutomation: () => machine.stopAutomation(),
  }
}

export { automaticHeightStates }
export default useAutomaticHeightAdjustment
