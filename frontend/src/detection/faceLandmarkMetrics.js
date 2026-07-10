import { calculateEyeCenter } from './heightEyeLandmarks.js'

const essentialLandmarkIndices = Object.freeze({
  nose: [1, 4],
  eyes: [33, 133, 263, 362],
  mouth: [13, 14, 61, 291],
  cheeks: [234, 454],
  chin: [152],
})

const radiansToDegrees = 180 / Math.PI

function finiteLandmark(landmark) {
  return Boolean(
    landmark &&
      Number.isFinite(landmark.x) &&
      Number.isFinite(landmark.y) &&
      Number.isFinite(landmark.z),
  )
}

function getRegionAvailability(landmarks) {
  return Object.fromEntries(
    Object.entries(essentialLandmarkIndices).map(
      ([region, indices]) => [
        region,
        indices.every((index) => finiteLandmark(landmarks[index])),
      ],
    ),
  )
}

function getLandmarkBounds(landmarks) {
  const validLandmarks = landmarks.filter(finiteLandmark)

  if (!validLandmarks.length) {
    return null
  }

  const xValues = validLandmarks.map(({ x }) => x)
  const yValues = validLandmarks.map(({ y }) => y)
  const minX = Math.min(...xValues)
  const maxX = Math.max(...xValues)
  const minY = Math.min(...yValues)
  const maxY = Math.max(...yValues)

  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  }
}

function averagePoint(landmarks, indices) {
  const points = indices
    .map((index) => landmarks[index])
    .filter(finiteLandmark)

  if (points.length !== indices.length) {
    return null
  }

  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
  }
}

function calculateRollFromLandmarks(landmarks) {
  const imageLeftEye = averagePoint(landmarks, [33, 133])
  const imageRightEye = averagePoint(landmarks, [263, 362])

  if (!imageLeftEye || !imageRightEye) {
    return null
  }

  return (
    Math.atan2(
      imageRightEye.y - imageLeftEye.y,
      imageRightEye.x - imageLeftEye.x,
    ) * radiansToDegrees
  )
}

function getMatrixValue(matrix, row, column) {
  if (
    !matrix ||
    matrix.rows < 3 ||
    matrix.columns < 3 ||
    !Array.isArray(matrix.data) &&
      !ArrayBuffer.isView(matrix.data)
  ) {
    return null
  }

  return matrix.data[row * matrix.columns + column]
}

function calculateEulerAngles(matrix, convention) {
  const r00 = getMatrixValue(matrix, 0, 0)
  const r10 = getMatrixValue(matrix, 1, 0)
  const r20 = getMatrixValue(matrix, 2, 0)
  const r21 = getMatrixValue(matrix, 2, 1)
  const r22 = getMatrixValue(matrix, 2, 2)

  if ([r00, r10, r20, r21, r22].some((value) => value === null)) {
    return {
      roll: null,
      yaw: null,
      pitch: null,
    }
  }

  const clampedR20 = Math.max(-1, Math.min(1, r20))

  return {
    roll:
      Math.atan2(r10, r00) *
      radiansToDegrees *
      convention.rollSign,
    yaw:
      Math.asin(-clampedR20) *
      radiansToDegrees *
      convention.yawSign,
    pitch:
      Math.atan2(r21, r22) *
      radiansToDegrees *
      convention.pitchSign,
  }
}

function getLandmarkConfidence(landmarks) {
  const essentialIndices = Object.values(
    essentialLandmarkIndices,
  ).flat()
  const visibilityValues = essentialIndices
    .map((index) => landmarks[index]?.visibility)
    .filter(
      (visibility) =>
        Number.isFinite(visibility) && visibility > 0,
    )

  if (!visibilityValues.length) {
    return {
      confidence: null,
      confidenceAvailable: false,
      confidenceSource: 'mediapipe_internal_thresholds',
    }
  }

  return {
    confidence: Math.min(...visibilityValues),
    confidenceAvailable: true,
    confidenceSource: 'landmark_visibility',
  }
}

function calculateFaceMetrics({
  landmarks,
  transformationMatrix,
  poseConvention,
}) {
  const bounds = getLandmarkBounds(landmarks)
  const overlapRegions = getRegionAvailability(landmarks)
  const essentialLandmarksPresent = Object.values(
    overlapRegions,
  ).every(Boolean)

  if (!bounds) {
    return null
  }

  const matrixAngles = calculateEulerAngles(
    transformationMatrix,
    poseConvention,
  )
  const landmarkRoll = calculateRollFromLandmarks(landmarks)
  const confidence = getLandmarkConfidence(landmarks)
  const eyeCenter = calculateEyeCenter(landmarks)

  return {
    ...confidence,
    passedInternalConfidenceThresholds: true,
    centerX: bounds.centerX,
    centerY: bounds.centerY,
    faceWidthRatio: bounds.width,
    faceHeightRatio: bounds.height,
    eyeCenterX: eyeCenter?.x ?? null,
    eyeCenterY: eyeCenter?.y ?? null,
    eyeCenterMethod: eyeCenter?.method ?? null,
    eyeLandmarksAvailable: Boolean(eyeCenter),
    roll:
      landmarkRoll === null
        ? matrixAngles.roll
        : landmarkRoll * poseConvention.rollSign,
    yaw: matrixAngles.yaw,
    pitch: matrixAngles.pitch,
    landmarksAvailable: true,
    essentialLandmarksPresent,
    overlapRegions,
    trackingBox: {
      x: bounds.minX,
      y: bounds.minY,
      width: bounds.width,
      height: bounds.height,
      centerX: bounds.centerX,
      centerY: bounds.centerY,
    },
  }
}

export {
  calculateEulerAngles,
  calculateFaceMetrics,
  calculateRollFromLandmarks,
  essentialLandmarkIndices,
}
