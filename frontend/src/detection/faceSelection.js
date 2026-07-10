function getFaceArea(face) {
  const width = face?.faceWidthRatio
  const height = face?.faceHeightRatio

  return Number.isFinite(width) &&
    Number.isFinite(height) &&
    width > 0 &&
    height > 0
    ? width * height
    : 0
}

function isFaceCenterInRoi(face, roi) {
  return Boolean(
    Number.isFinite(face?.centerX) &&
      Number.isFinite(face?.centerY) &&
      face.centerX >= roi.left &&
      face.centerX <= roi.right &&
      face.centerY >= roi.top &&
      face.centerY <= roi.bottom,
  )
}

function getFaceAspectRatio(face) {
  return Number.isFinite(face?.faceWidthRatio) &&
    Number.isFinite(face?.faceHeightRatio) &&
    face.faceHeightRatio > 0
    ? face.faceWidthRatio / face.faceHeightRatio
    : null
}

function isFaceGeometryValid(face, config, thresholds) {
  const trackingBox = face?.trackingBox
  const area = getFaceArea(face)
  const aspectRatio = getFaceAspectRatio(face)
  const confidenceAvailable =
    face?.confidenceAvailable ??
    Number.isFinite(face?.confidence)
  const confidenceValid = confidenceAvailable
    ? Number.isFinite(face?.confidence) &&
      face.confidence >= thresholds.minDetectionConfidence
    : face?.passedInternalConfidenceThresholds === true

  return Boolean(
    trackingBox &&
      Number.isFinite(trackingBox.x) &&
      Number.isFinite(trackingBox.y) &&
      Number.isFinite(trackingBox.width) &&
      Number.isFinite(trackingBox.height) &&
      face.landmarksAvailable &&
      face.essentialLandmarksPresent &&
      confidenceValid &&
      face.faceWidthRatio >=
        config.faceTracking.minimumWidthRatio &&
      face.faceHeightRatio >=
        config.faceTracking.minimumHeightRatio &&
      area >= config.faceTracking.minimumAreaRatio &&
      aspectRatio >= config.faceTracking.minimumAspectRatio &&
      aspectRatio <= config.faceTracking.maximumAspectRatio,
  )
}

function createLegacyFace(result) {
  if (!result.faceDetected || !result.trackingBox) {
    return null
  }

  return {
    confidence: result.confidence,
    confidenceAvailable: result.confidenceAvailable,
    confidenceSource: result.confidenceSource,
    passedInternalConfidenceThresholds:
      result.passedInternalConfidenceThresholds,
    centerX: result.centerX,
    centerY: result.centerY,
    faceWidthRatio: result.faceWidthRatio,
    faceHeightRatio: result.faceHeightRatio,
    roll: result.roll,
    yaw: result.yaw,
    pitch: result.pitch,
    landmarksAvailable: result.landmarksAvailable,
    essentialLandmarksPresent: result.essentialLandmarksPresent,
    overlapRegions: result.overlapRegions,
    trackingBox: result.trackingBox,
  }
}

function selectPositioningFaces(result, config) {
  const thresholds = config.cameraThresholds[result.cameraId]
  const sourceFaces =
    Array.isArray(result.faces) && result.faces.length
      ? result.faces
      : [createLegacyFace(result)].filter(Boolean)
  const classifiedFaces = sourceFaces
    .map((face, sourceIndex) => ({
      ...face,
      sourceIndex,
      area: getFaceArea(face),
      aspectRatio: getFaceAspectRatio(face),
      geometryValid: isFaceGeometryValid(
        face,
        config,
        thresholds,
      ),
      inRoi: isFaceCenterInRoi(
        face,
        config.positioningRoi,
      ),
      classification: 'outside_roi',
    }))
    .sort((first, second) => second.area - first.area)
  const roiFaces = classifiedFaces.filter(
    (face) => face.inRoi && face.geometryValid,
  )
  const primaryFace = roiFaces[0] ?? null
  const secondFace = roiFaces[1] ?? null
  const secondaryToPrimaryAreaRatio =
    primaryFace && secondFace && primaryFace.area > 0
      ? secondFace.area / primaryFace.area
      : null
  const relevantSecondaryFaces = primaryFace
    ? roiFaces.slice(1).filter(
        (face) =>
          face.area / primaryFace.area >=
          config.faceSelection.secondaryFaceIgnoreRatio,
      )
    : []

  const faces = classifiedFaces.map((face) => {
    let classification = 'outside_roi'

    if (!face.geometryValid) {
      classification = 'rejected_geometry'
    } else if (primaryFace?.sourceIndex === face.sourceIndex) {
      classification = 'primary'
    } else if (
      relevantSecondaryFaces.some(
        (secondary) =>
          secondary.sourceIndex === face.sourceIndex,
      )
    ) {
      classification = 'relevant_secondary'
    } else if (face.inRoi) {
      classification = 'ignored_background'
    }

    return {
      ...face,
      classification,
    }
  })

  return {
    faces,
    totalFaceCount: sourceFaces.length,
    rawRoiFaceCount: classifiedFaces.filter(
      (face) => face.inRoi,
    ).length,
    roiFaceCount: roiFaces.length,
    relevantFaceCount:
      (primaryFace ? 1 : 0) + relevantSecondaryFaces.length,
    ignoredBackgroundFaceCount: faces.filter(
      ({ classification }) =>
        classification === 'ignored_background' ||
        classification === 'outside_roi',
    ).length,
    rejectedFaceCount: faces.filter(
      ({ classification }) =>
        classification === 'rejected_geometry',
    ).length,
    primaryFace:
      faces.find(
        ({ classification }) => classification === 'primary',
      ) ?? null,
    secondaryToPrimaryAreaRatio,
    primaryToSecondaryAreaRatio:
      secondaryToPrimaryAreaRatio > 0
        ? 1 / secondaryToPrimaryAreaRatio
        : null,
  }
}

export {
  getFaceArea,
  getFaceAspectRatio,
  isFaceGeometryValid,
  isFaceCenterInRoi,
  selectPositioningFaces,
}
