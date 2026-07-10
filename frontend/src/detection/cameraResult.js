import { cameraIds } from '../config/positioningConfig.js'

function createCameraResult(
  cameraId,
  overrides = {},
) {
  if (!cameraIds.includes(cameraId)) {
    throw new Error(`Unknown positioning camera: ${cameraId}`)
  }

  return {
    cameraId,
    available: false,
    simulated: false,
    faceCount: 0,
    totalFaceCount: 0,
    roiFaceCount: 0,
    rawRoiFaceCount: 0,
    relevantFaceCount: 0,
    ignoredBackgroundFaceCount: 0,
    rejectedFaceCount: 0,
    confirmedFaceCount: 0,
    faceDetected: false,
    faces: [],
    primaryFaceSourceIndex: null,
    candidatePrimaryFace: null,
    confirmedPrimaryFace: null,
    primaryIdentityChanged: false,
    multipleFacesCoherent: false,
    secondaryToPrimaryAreaRatio: null,
    primaryToSecondaryAreaRatio: null,
    confidence: 0,
    confidenceAvailable: false,
    confidenceSource: null,
    passedInternalConfidenceThresholds: false,
    centerX: null,
    centerY: null,
    rawFaceWidthRatio: null,
    faceWidthRatio: null,
    faceHeightRatio: null,
    eyeCenterX: null,
    eyeCenterY: null,
    eyeCenterMethod: null,
    eyeLandmarksAvailable: false,
    roll: null,
    yaw: null,
    pitch: null,
    centerMovementRatio: null,
    sizeVariationRatio: null,
    angleVariationDegrees: null,
    stability: 0,
    landmarksAvailable: false,
    essentialLandmarksPresent: false,
    overlapRegions: {
      nose: false,
      eyes: false,
      mouth: false,
      cheeks: false,
    },
    withinFrame: false,
    usableForMapping: false,
    timestamp: 0,
    trackingBox: null,
    reacquiring: false,
    ...overrides,
  }
}

function createInitialCameraResults(mode) {
  return Object.fromEntries(
    cameraIds.map((cameraId) => [
      cameraId,
      createCameraResult(cameraId, {
        simulated: mode === 'single' && cameraId !== 'top',
      }),
    ]),
  )
}

function isCameraResultFresh(result, now, maxDataAgeMs) {
  return Boolean(
      result?.timestamp > 0 &&
      now >= result.timestamp &&
      now - result.timestamp < maxDataAgeMs,
  )
}

function mirrorTrackingBoxForPreview(box) {
  if (!box) {
    return null
  }

  return {
    ...box,
    x: 1 - box.x - box.width,
    centerX: 1 - box.centerX,
  }
}

export {
  createCameraResult,
  createInitialCameraResults,
  isCameraResultFresh,
  mirrorTrackingBoxForPreview,
}
