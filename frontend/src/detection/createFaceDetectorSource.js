import positioningConfig from '../config/positioningConfig.js'
import { createCameraResult } from './cameraResult.js'

function getLargestFace(faces) {
  return faces.reduce((largestFace, face) => {
    if (!largestFace) {
      return face
    }

    const largestArea =
      largestFace.boundingBox.width *
      largestFace.boundingBox.height
    const currentArea =
      face.boundingBox.width * face.boundingBox.height

    return currentArea > largestArea ? face : largestFace
  }, null)
}

function createFaceDetectorSource({
  cameraId = 'top',
  videoElement,
  onDetection,
  onError,
  config = positioningConfig,
}) {
  if (typeof window.FaceDetector !== 'function') {
    throw new Error('Native FaceDetector is unavailable')
  }

  const detector = new window.FaceDetector({
    fastMode: true,
    maxDetectedFaces: config.mediaPipe.maxFaces,
  })
  let disposed = false
  let stopped = true
  let timeoutId = null

  const scheduleNextDetection = () => {
    if (!stopped && !disposed && timeoutId === null) {
      timeoutId = window.setTimeout(
        analyseFrame,
        config.analysis.intervalMs,
      )
    }
  }

  const analyseFrame = async () => {
    timeoutId = null

    if (stopped || disposed) {
      return
    }

    if (
      videoElement.readyState <
        HTMLMediaElement.HAVE_CURRENT_DATA ||
      !videoElement.videoWidth ||
      !videoElement.videoHeight
    ) {
      scheduleNextDetection()
      return
    }

    try {
      const faces = await detector.detect(videoElement)

      if (stopped || disposed) {
        return
      }

      const face = getLargestFace(faces)
      const timestamp = performance.now()
      const box = face?.boundingBox
      const trackingBox = box
        ? {
            x: box.x / videoElement.videoWidth,
            y: box.y / videoElement.videoHeight,
            width: box.width / videoElement.videoWidth,
            height: box.height / videoElement.videoHeight,
            centerX:
              (box.x + box.width / 2) /
              videoElement.videoWidth,
            centerY:
              (box.y + box.height / 2) /
              videoElement.videoHeight,
          }
        : null

      onDetection(
        createCameraResult(cameraId, {
          available: true,
          faceCount: faces.length,
          faceDetected: faces.length > 0,
          confidence: face?.confidence ?? 0,
          centerX: trackingBox?.centerX ?? null,
          centerY: trackingBox?.centerY ?? null,
          faceWidthRatio: trackingBox?.width ?? null,
          faceHeightRatio: trackingBox?.height ?? null,
          trackingBox,
          landmarksAvailable: false,
          essentialLandmarksPresent: false,
          usableForMapping: false,
          timestamp,
        }),
      )
      scheduleNextDetection()
    } catch (error) {
      stopped = true

      if (!disposed) {
        onError(error)
      }
    }
  }

  const start = () => {
    if (disposed || !stopped) {
      return
    }

    stopped = false
    timeoutId = window.setTimeout(analyseFrame, 0)
  }

  const stop = () => {
    stopped = true

    if (timeoutId !== null) {
      window.clearTimeout(timeoutId)
      timeoutId = null
    }
  }

  const dispose = () => {
    stop()
    disposed = true
  }

  return {
    engine: 'native-face-detector-degraded',
    supportsFullValidation: false,
    start,
    stop,
    dispose,
    getPerformance: () => ({
      analysisCount: 0,
      measuredFps: 0,
    }),
  }
}

export default createFaceDetectorSource
