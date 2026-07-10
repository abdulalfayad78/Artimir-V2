import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import positioningConfig from '../config/positioningConfig.js'
import createFaceDetectionSource from '../detection/createFaceDetectionSource.js'
import {
  createDiagnosticDemoState,
  createMultiCameraAggregator,
  getGlobalPositionCriteria,
  positioningInstructions,
} from '../detection/multiCameraAggregator.js'
import { mirrorTrackingBoxForPreview } from '../detection/cameraResult.js'
import useCameraStream, { cameraStates } from './useCameraStream'

const sourceModes = Object.freeze({
  camera: 'camera',
  demo: 'demo',
})

const detectionStates = Object.freeze({
  loading: 'detection_loading',
  active: 'detection_active',
  error: 'detection_error',
})

function usePositionDetection({
  completeOnPositionCorrect = true,
  enabled = false,
} = {}) {
  const {
    availableCameras,
    changeCamera,
    errorCode: cameraErrorCode,
    selectedDeviceId,
    startCamera,
    status: cameraStatus,
    stopCamera,
    stream,
    videoRef,
  } = useCameraStream({ enabled })
  const aggregatorRef = useRef(
    createMultiCameraAggregator(positioningConfig),
  )
  const [globalState, setGlobalState] = useState(() =>
    aggregatorRef.current.getState(0),
  )
  const [sourceMode, setSourceMode] = useState(sourceModes.camera)
  const [detectionStatus, setDetectionStatus] = useState(
    detectionStates.loading,
  )
  const [detectionError, setDetectionError] = useState(null)
  const [detectionEngine, setDetectionEngine] = useState(null)
  const [performanceInfo, setPerformanceInfo] = useState({
    analysisCount: 0,
    measuredFps: 0,
  })
  const detectionSourceRef = useRef(null)
  const freshnessTimeoutRef = useRef(null)
  const completedRef = useRef(false)

  const stopDetectionSource = useCallback(() => {
    if (freshnessTimeoutRef.current !== null) {
      window.clearTimeout(freshnessTimeoutRef.current)
      freshnessTimeoutRef.current = null
    }

    if (detectionSourceRef.current) {
      detectionSourceRef.current.stop()
      detectionSourceRef.current.dispose()
      detectionSourceRef.current = null
    }
  }, [])

  const applyGlobalState = useCallback((nextState) => {
    setGlobalState(nextState)
  }, [])

  const resetDetection = useCallback(() => {
    completedRef.current = false
    aggregatorRef.current.reset()
    applyGlobalState(aggregatorRef.current.getState(0))
    setDetectionError(null)
    setDetectionEngine(null)
    setDetectionStatus(detectionStates.loading)
    setPerformanceInfo({
      analysisCount: 0,
      measuredFps: 0,
    })
  }, [applyGlobalState])

  const completeDetection = useCallback(
    (nextState) => {
      if (
        completedRef.current ||
        sourceMode !== sourceModes.camera
      ) {
        return
      }

      completedRef.current = true
      applyGlobalState(nextState)
      stopDetectionSource()
      stopCamera()
    },
    [
      applyGlobalState,
      sourceMode,
      stopCamera,
      stopDetectionSource,
    ],
  )

  const handleDetection = useCallback(
    (cameraResult) => {
      if (completedRef.current) {
        return
      }

      const nextState = aggregatorRef.current.update(
        cameraResult,
        cameraResult.timestamp,
      )
      const nextPerformance =
        detectionSourceRef.current?.getPerformance?.()

      if (freshnessTimeoutRef.current !== null) {
        window.clearTimeout(freshnessTimeoutRef.current)
      }
      freshnessTimeoutRef.current = window.setTimeout(() => {
        freshnessTimeoutRef.current = null

        if (!completedRef.current) {
          const staleState = aggregatorRef.current.getState(
            performance.now(),
          )
          applyGlobalState(staleState)
          freshnessTimeoutRef.current = window.setTimeout(() => {
            freshnessTimeoutRef.current = null

            if (!completedRef.current) {
              applyGlobalState(
                aggregatorRef.current.getState(
                  performance.now(),
                ),
              )
            }
          }, positioningConfig.filtering.criticalDisplayConfirmMs)
        }
      }, positioningConfig.analysis.maxDataAgeMs)

      if (completeOnPositionCorrect && nextState.positionCorrect) {
        completeDetection(nextState)
      } else {
        applyGlobalState(nextState)
      }

      if (nextPerformance) {
        setPerformanceInfo(nextPerformance)
      }
    },
    [applyGlobalState, completeDetection, completeOnPositionCorrect],
  )

  const handleDetectionError = useCallback(() => {
    if (completedRef.current) {
      return
    }

    stopDetectionSource()
    applyGlobalState(
      aggregatorRef.current.fail(performance.now()),
    )
    setDetectionStatus(detectionStates.error)
    setDetectionError('detection_unavailable')
  }, [applyGlobalState, stopDetectionSource])

  const activateDemoMode = useCallback(() => {
    stopDetectionSource()
    stopCamera()
    resetDetection()
    setDetectionStatus(detectionStates.active)
    setDetectionEngine('manual')
    setSourceMode(sourceModes.demo)
  }, [resetDetection, stopCamera, stopDetectionSource])

  const activateCameraMode = useCallback(() => {
    if (!enabled) {
      return
    }

    stopDetectionSource()
    stopCamera()
    resetDetection()
    setSourceMode(sourceModes.camera)
  }, [enabled, resetDetection, stopCamera, stopDetectionSource])

  const retryCamera = useCallback(() => {
    if (!enabled) {
      return
    }

    stopDetectionSource()
    stopCamera()
    resetDetection()
    setSourceMode(sourceModes.camera)
    startCamera()
  }, [
    enabled,
    resetDetection,
    startCamera,
    stopCamera,
    stopDetectionSource,
  ])

  const selectCamera = useCallback(
    (deviceId) => {
      stopDetectionSource()
      resetDetection()
      setSourceMode(sourceModes.camera)
      changeCamera(deviceId)
    },
    [changeCamera, resetDetection, stopDetectionSource],
  )

  const setDemoPositionState = useCallback(
    (nextInstruction) => {
      if (
        sourceMode !== sourceModes.demo ||
        !Object.values(positioningInstructions).includes(
          nextInstruction,
        )
      ) {
        return
      }

      const currentState = aggregatorRef.current.getState(
        performance.now(),
      )
      applyGlobalState(
        createDiagnosticDemoState(
          currentState,
          nextInstruction,
        ),
      )
    },
    [applyGlobalState, sourceMode],
  )

  const shutdown = useCallback(() => {
    stopDetectionSource()
    stopCamera()
  }, [stopCamera, stopDetectionSource])

  useEffect(() => {
    if (!enabled || sourceMode !== sourceModes.camera) {
      stopCamera()
      return undefined
    }

    startCamera()

    return () => {
      stopCamera()
    }
  }, [enabled, sourceMode, startCamera, stopCamera])

  useEffect(() => {
    if (
      !enabled ||
      sourceMode !== sourceModes.camera ||
      cameraStatus !== cameraStates.active ||
      !stream ||
      !videoRef.current ||
      completedRef.current
    ) {
      stopDetectionSource()
      return undefined
    }

    let cancelled = false
    setDetectionStatus(detectionStates.loading)
    setDetectionError(null)

    const initializeDetection = async () => {
      try {
        const detectionSource = await createFaceDetectionSource({
          cameraId: positioningConfig.primaryCameraId,
          videoElement: videoRef.current,
          onDetection: handleDetection,
          onError: handleDetectionError,
        })

        if (cancelled) {
          detectionSource.dispose()
          return
        }

        detectionSourceRef.current = detectionSource
        setDetectionEngine(detectionSource.engine)

        if (!detectionSource.supportsFullValidation) {
          setDetectionStatus(detectionStates.error)
          setDetectionError('landmarks_unavailable')
        } else {
          setDetectionStatus(detectionStates.active)
        }

        await detectionSource.start()
      } catch {
        if (!cancelled) {
          handleDetectionError()
        }
      }
    }

    initializeDetection()

    return () => {
      cancelled = true
      stopDetectionSource()
    }
  }, [
    cameraStatus,
    enabled,
    handleDetection,
    handleDetectionError,
    sourceMode,
    stopDetectionSource,
    stream,
    videoRef,
  ])

  useEffect(
    () => () => {
      stopDetectionSource()
    },
    [stopDetectionSource],
  )

  const rawTrackingBox =
    globalState.cameras[positioningConfig.primaryCameraId]
      ?.trackingBox ?? null
  const trackingBox = positioningConfig.video.mirroredPreview
    ? mirrorTrackingBoxForPreview(rawTrackingBox)
    : rawTrackingBox
  const criteria = getGlobalPositionCriteria(globalState)
  const faceOverlays = (
    globalState.cameras[positioningConfig.primaryCameraId]
      ?.faces ?? []
  ).map((face) => ({
    ...face,
    trackingBox: positioningConfig.video.mirroredPreview
      ? mirrorTrackingBoxForPreview(face.trackingBox)
      : face.trackingBox,
  }))

  return {
    activateCameraMode,
    activateDemoMode,
    availableCameras,
    cameraStatus,
    criteria,
    detectionEngine,
    detectionError,
    detectionStatus,
    errorCode: cameraErrorCode,
    faceOverlays,
    globalState,
    performanceInfo,
    positionState: globalState.primaryInstruction,
    retryCamera,
    selectCamera,
    selectedDeviceId,
    setDemoPositionState,
    shutdown,
    sourceMode,
    stabilityProgress: globalState.stableProgress,
    trackingBox,
    videoRef,
  }
}

export { detectionStates, sourceModes }
export default usePositionDetection
