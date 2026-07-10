import { useEffect, useMemo, useRef, useState } from 'react'
import heightObservationConfig from '../config/heightObservationConfig.js'
import {
  createHeightObservationAnalyzer,
  createInitialHeightObservationState,
} from '../detection/heightObservation.js'
import usePositionDetection from './usePositionDetection'

function useHeightObservation({
  config = heightObservationConfig,
  enabled = false,
} = {}) {
  const detection = usePositionDetection({
    completeOnPositionCorrect: false,
    enabled,
  })
  const { globalState, shutdown } = detection
  const analyzer = useMemo(
    () => createHeightObservationAnalyzer({ config }),
    [config],
  )
  const [observation, setObservation] = useState(() =>
    createInitialHeightObservationState(config),
  )
  const destroyedRef = useRef(false)

  useEffect(() => {
    destroyedRef.current = false
    analyzer.reset()
    setObservation(createInitialHeightObservationState(config))

    return () => {
      destroyedRef.current = true
      analyzer.reset()
      shutdown()
    }
  }, [analyzer, config, shutdown])

  useEffect(() => {
    if (!enabled || destroyedRef.current) {
      return
    }

    setObservation(
      analyzer.update(
        globalState,
        globalState.timestamp || performance.now(),
      ),
    )
  }, [analyzer, globalState, enabled])

  return {
    ...detection,
    observation,
  }
}

export default useHeightObservation
