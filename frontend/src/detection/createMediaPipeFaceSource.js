import {
  FaceLandmarker,
  FilesetResolver,
} from '@mediapipe/tasks-vision'
import positioningConfig from '../config/positioningConfig.js'
import { createCameraResult } from './cameraResult.js'
import { calculateFaceMetrics } from './faceLandmarkMetrics.js'

let visionFilesetPromise = null

function getLocalAssetUrl(path) {
  const baseUrl = new URL(
    import.meta.env.BASE_URL,
    window.location.origin,
  )
  return new URL(path, baseUrl).href
}

function createVideoMetadataWait(videoElement, isStopped) {
  if (
    videoElement.readyState >= HTMLMediaElement.HAVE_METADATA &&
    videoElement.videoWidth &&
    videoElement.videoHeight
  ) {
    return {
      promise: Promise.resolve(),
      cancel: () => {},
    }
  }

  let cancel = () => {}
  const promise = new Promise((resolve, reject) => {
    const cleanup = () => {
      videoElement.removeEventListener(
        'loadedmetadata',
        handleLoadedMetadata,
      )
      videoElement.removeEventListener('error', handleError)
    }
    const handleLoadedMetadata = () => {
      cleanup()

      if (isStopped()) {
        reject(new DOMException('Detection stopped', 'AbortError'))
      } else {
        resolve()
      }
    }
    const handleError = () => {
      cleanup()
      reject(new Error('Video metadata unavailable'))
    }

    cancel = () => {
      cleanup()
      reject(new DOMException('Detection stopped', 'AbortError'))
    }

    videoElement.addEventListener(
      'loadedmetadata',
      handleLoadedMetadata,
      { once: true },
    )
    videoElement.addEventListener('error', handleError, {
      once: true,
    })
  })

  return { promise, cancel }
}

async function createMediaPipeLandmarker(config) {
  if (!visionFilesetPromise) {
    visionFilesetPromise = FilesetResolver.forVisionTasks(
      getLocalAssetUrl(config.mediaPipe.wasmPath),
    )
  }

  const visionFileset = await visionFilesetPromise
  const modelAssetPath = getLocalAssetUrl(
    config.mediaPipe.modelPath,
  )
  const createLandmarker = (delegate) =>
    FaceLandmarker.createFromOptions(visionFileset, {
      baseOptions: {
        modelAssetPath,
        delegate,
      },
      runningMode: 'VIDEO',
      numFaces: config.mediaPipe.maxFaces,
      minFaceDetectionConfidence:
        config.mediaPipe.minDetectionConfidence,
      minFacePresenceConfidence:
        config.mediaPipe.minFacePresenceConfidence,
      minTrackingConfidence:
        config.mediaPipe.minTrackingConfidence,
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: true,
    })

  try {
    return await createLandmarker('GPU')
  } catch {
    return createLandmarker('CPU')
  }
}

async function createMediaPipeFaceSource({
  cameraId = 'top',
  videoElement,
  onDetection,
  onError,
  config = positioningConfig,
  landmarkerFactory = createMediaPipeLandmarker,
}) {
  const landmarker = await landmarkerFactory(config)
  let disposed = false
  let stopped = true
  let timeoutId = null
  let lastVideoTime = -1
  let cancelMetadataWait = null
  let analysisCount = 0
  let firstAnalysisAt = null
  let inferenceInProgress = false
  let lastInferenceDurationMs = 0
  let totalInferenceDurationMs = 0

  const scheduleNextDetection = () => {
    if (!stopped && !disposed && timeoutId === null) {
      timeoutId = window.setTimeout(
        analyseFrame,
        config.analysis.intervalMs,
      )
    }
  }

  const analyseFrame = () => {
    timeoutId = null

    if (stopped || disposed) {
      return
    }

    if (inferenceInProgress) {
      scheduleNextDetection()
      return
    }

    try {
      if (
        videoElement.readyState <
          HTMLMediaElement.HAVE_CURRENT_DATA ||
        videoElement.currentTime === lastVideoTime
      ) {
        scheduleNextDetection()
        return
      }

      lastVideoTime = videoElement.currentTime
      const timestamp = performance.now()
      inferenceInProgress = true
      const result = landmarker.detectForVideo(
        videoElement,
        timestamp,
      )
      lastInferenceDurationMs = Math.max(
        0,
        performance.now() - timestamp,
      )
      totalInferenceDurationMs += lastInferenceDurationMs
      inferenceInProgress = false

      if (stopped || disposed) {
        return
      }

      analysisCount += 1
      firstAnalysisAt ??= timestamp
      const faces = result.faceLandmarks
        .map((landmarks, index) =>
          calculateFaceMetrics({
            landmarks,
            transformationMatrix:
              result.facialTransformationMatrixes[index],
            poseConvention: config.poseConvention,
          }),
        )
        .filter(Boolean)
      const faceCount = faces.length

      onDetection(
        createCameraResult(cameraId, {
          available: true,
          faceCount,
          totalFaceCount: faceCount,
          faceDetected: faceCount > 0,
          faces,
          timestamp,
        }),
      )
      scheduleNextDetection()
    } catch (error) {
      inferenceInProgress = false
      stopped = true

      if (!disposed) {
        onError(error)
      }
    }
  }

  const start = async () => {
    if (disposed || !stopped) {
      return
    }

    stopped = false

    try {
      const metadataWait = createVideoMetadataWait(
        videoElement,
        () => stopped || disposed,
      )
      cancelMetadataWait = metadataWait.cancel
      await metadataWait.promise
      cancelMetadataWait = null

      if (!stopped && !disposed) {
        timeoutId = window.setTimeout(analyseFrame, 0)
      }
    } catch (error) {
      if (!stopped && !disposed && error.name !== 'AbortError') {
        stopped = true
        onError(error)
      }
    }
  }

  const stop = () => {
    stopped = true
    cancelMetadataWait?.()
    cancelMetadataWait = null

    if (timeoutId !== null) {
      window.clearTimeout(timeoutId)
      timeoutId = null
    }
  }

  const dispose = () => {
    if (disposed) {
      return
    }

    stop()
    disposed = true
    landmarker.close()
  }

  const getPerformance = () => {
    const durationMs =
      firstAnalysisAt === null
        ? 0
        : Math.max(0, performance.now() - firstAnalysisAt)

    return {
      analysisCount,
      measuredFps:
        durationMs > 0 && analysisCount > 1
          ? ((analysisCount - 1) * 1000) / durationMs
          : 0,
      lastInferenceDurationMs,
      averageInferenceDurationMs:
        analysisCount > 0
          ? totalInferenceDurationMs / analysisCount
          : 0,
    }
  }

  return {
    engine: 'mediapipe-face-landmarker',
    supportsFullValidation: true,
    start,
    stop,
    dispose,
    getPerformance,
  }
}

export { createMediaPipeLandmarker }
export default createMediaPipeFaceSource
