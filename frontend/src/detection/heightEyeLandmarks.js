/*
 * MediaPipe FaceLandmarker may provide 478 landmarks when iris points
 * are available. Those points are preferred because they track the eye
 * centre directly. When they are unavailable, the fallback uses several
 * stable eyelid/corner landmarks already consistent with the existing
 * faceLandmarkMetrics eye validation. A single point per eye is never
 * used for height observation.
 */
const irisEyeLandmarkIndices = Object.freeze({
  leftEye: Object.freeze([468, 469, 470, 471, 472]),
  rightEye: Object.freeze([473, 474, 475, 476, 477]),
})

const contourEyeLandmarkIndices = Object.freeze({
  leftEye: Object.freeze([33, 133, 159, 145]),
  rightEye: Object.freeze([263, 362, 386, 374]),
})

function isFiniteLandmark(landmark) {
  return Boolean(
    landmark &&
      Number.isFinite(landmark.x) &&
      Number.isFinite(landmark.y),
  )
}

function averageLandmarks(landmarks, indices) {
  const points = indices
    .map((index) => landmarks[index])
    .filter(isFiniteLandmark)

  if (points.length !== indices.length) {
    return null
  }

  return {
    x:
      points.reduce((sum, point) => sum + point.x, 0) /
      points.length,
    y:
      points.reduce((sum, point) => sum + point.y, 0) /
      points.length,
  }
}

function calculateEyeCenter(landmarks) {
  const irisLeft = averageLandmarks(
    landmarks,
    irisEyeLandmarkIndices.leftEye,
  )
  const irisRight = averageLandmarks(
    landmarks,
    irisEyeLandmarkIndices.rightEye,
  )

  if (irisLeft && irisRight) {
    return {
      method: 'iris',
      x: (irisLeft.x + irisRight.x) / 2,
      y: (irisLeft.y + irisRight.y) / 2,
    }
  }

  const contourLeft = averageLandmarks(
    landmarks,
    contourEyeLandmarkIndices.leftEye,
  )
  const contourRight = averageLandmarks(
    landmarks,
    contourEyeLandmarkIndices.rightEye,
  )

  if (contourLeft && contourRight) {
    return {
      method: 'eye_contour',
      x: (contourLeft.x + contourRight.x) / 2,
      y: (contourLeft.y + contourRight.y) / 2,
    }
  }

  return null
}

export {
  calculateEyeCenter,
  contourEyeLandmarkIndices,
  irisEyeLandmarkIndices,
}
