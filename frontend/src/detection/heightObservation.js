import heightObservationConfig from '../config/heightObservationConfig.js'
import positioningConfig from '../config/positioningConfig.js'

const heightRecommendations = Object.freeze({
  artimirShouldMoveUp: 'artimir_should_move_up',
  artimirShouldMoveDown: 'artimir_should_move_down',
  heightCorrect: 'height_correct',
  faceUnstable: 'face_unstable',
  faceNotDetected: 'face_not_detected',
  reacquiring: 'reacquiring',
})

const imageVerticalObservations = Object.freeze({
  eyesTooHigh: 'eyes_too_high_in_image',
  eyesTooLow: 'eyes_too_low_in_image',
  eyesOnTarget: 'eyes_on_target',
  unavailable: 'unavailable',
})

function isFiniteNumber(value) {
  return Number.isFinite(value)
}

function createDiagnostics(overrides = {}) {
  return {
    dataAgeMs: null,
    displayedHeightRecommendation:
      heightRecommendations.reacquiring,
    eyesAvailable: false,
    faceDetected: false,
    faceSizeValid: false,
    faceValid: false,
    insideRoi: false,
    poseValid: false,
    primaryFaceConfirmed: false,
    rawBlockingState: null,
    rawHeightRecommendation: heightRecommendations.reacquiring,
    stable: false,
    stableSamples: 0,
    ...overrides,
  }
}

function evaluateHeightSpecificFace(top, globalState, dataAgeMs) {
  const thresholds =
    positioningConfig.cameraThresholds[
      globalState.primaryCameraId ?? positioningConfig.primaryCameraId
    ] ?? positioningConfig.cameraThresholds.top
  const faceDetected = Boolean(top.faceDetected)
  const primaryFaceConfirmed = Boolean(top.confirmedPrimaryFace)
  const insideRoi = top.relevantFaceCount === 1
  const faceSizeValid =
    !isFiniteNumber(top.faceWidthRatio) ||
    top.faceWidthRatio >= thresholds.minFaceWidthRatio
  const poseValid =
    [top.roll, top.yaw, top.pitch].every(isFiniteNumber) &&
    Math.abs(top.roll) <= thresholds.maxRollDegrees &&
    Math.abs(top.yaw) <= thresholds.maxYawDegrees &&
    Math.abs(top.pitch) <= thresholds.maxPitchDegrees
  const eyesAvailable =
    top.eyeLandmarksAvailable && isFiniteNumber(top.eyeCenterY)
  const movementMetricsAvailable = [
    top.centerMovementRatio,
    top.sizeVariationRatio,
    top.angleVariationDegrees,
  ].every(isFiniteNumber)
  const stable =
    movementMetricsAvailable &&
    top.centerMovementRatio <= thresholds.maxCenterMovementRatio &&
    top.sizeVariationRatio <= thresholds.maxSizeVariationRatio &&
    top.angleVariationDegrees <= thresholds.maxAngleVariationDegrees

  return createDiagnostics({
    dataAgeMs,
    eyesAvailable,
    faceDetected,
    faceSizeValid,
    faceValid:
      faceDetected &&
      primaryFaceConfirmed &&
      insideRoi &&
      faceSizeValid &&
      poseValid &&
      eyesAvailable,
    insideRoi,
    poseValid,
    primaryFaceConfirmed,
    rawBlockingState: globalState.rawBlockingState ?? null,
    stable,
  })
}

function getPhysicalRecommendationFromImageObservation(
  imageObservation,
  direction,
) {
  if (imageObservation === imageVerticalObservations.eyesOnTarget) {
    return heightRecommendations.heightCorrect
  }

  if (imageObservation === imageVerticalObservations.eyesTooHigh) {
    return direction === 'inverted'
      ? heightRecommendations.artimirShouldMoveDown
      : heightRecommendations.artimirShouldMoveUp
  }

  if (imageObservation === imageVerticalObservations.eyesTooLow) {
    return direction === 'inverted'
      ? heightRecommendations.artimirShouldMoveUp
      : heightRecommendations.artimirShouldMoveDown
  }

  return heightRecommendations.reacquiring
}

function getImageObservationFromError(
  verticalError,
  previousRecommendation,
  config,
) {
  const activeTolerance =
    previousRecommendation === heightRecommendations.heightCorrect
      ? config.heightTolerance + config.heightHysteresis
      : config.heightTolerance

  if (Math.abs(verticalError) <= activeTolerance) {
    return imageVerticalObservations.eyesOnTarget
  }

  return verticalError < 0
    ? imageVerticalObservations.eyesTooHigh
    : imageVerticalObservations.eyesTooLow
}

function getPrimaryHeightCandidate(globalState, now, config) {
  const top =
    globalState?.cameras?.[globalState.primaryCameraId ?? 'top']

  if (!top?.available || top.timestamp <= 0) {
    return {
      rawHeightRecommendation:
        heightRecommendations.faceNotDetected,
      imageObservation: imageVerticalObservations.unavailable,
      reason: 'camera_unavailable',
      dataAgeMs: null,
      faceValid: false,
      stable: false,
      diagnostics: createDiagnostics({
        rawHeightRecommendation:
          heightRecommendations.faceNotDetected,
      }),
    }
  }

  const dataAgeMs = Math.max(0, now - top.timestamp)

  if (dataAgeMs > config.maximumDataAgeMs) {
    return {
      rawHeightRecommendation: heightRecommendations.reacquiring,
      imageObservation: imageVerticalObservations.unavailable,
      reason: 'data_stale',
      dataAgeMs,
      faceValid: false,
      stable: false,
      diagnostics: createDiagnostics({
        dataAgeMs,
        rawBlockingState: globalState.rawBlockingState ?? null,
        rawHeightRecommendation: heightRecommendations.reacquiring,
      }),
    }
  }

  const diagnostics = evaluateHeightSpecificFace(
    top,
    globalState,
    dataAgeMs,
  )

  if (
    top.totalFaceCount === 0 ||
    top.relevantFaceCount === 0 ||
    !top.faceDetected
  ) {
    return {
      rawHeightRecommendation:
        heightRecommendations.faceNotDetected,
      imageObservation: imageVerticalObservations.unavailable,
      reason: 'face_not_detected',
      dataAgeMs,
      faceValid: false,
      stable: false,
      diagnostics: {
        ...diagnostics,
        rawHeightRecommendation:
          heightRecommendations.faceNotDetected,
      },
    }
  }

  if (
    top.relevantFaceCount > 1 ||
    globalState.rawBlockingState === 'multiple_faces'
  ) {
    return {
      rawHeightRecommendation: heightRecommendations.faceUnstable,
      imageObservation: imageVerticalObservations.unavailable,
      reason: 'multiple_faces',
      dataAgeMs,
      faceValid: false,
      stable: false,
      diagnostics: {
        ...diagnostics,
        rawHeightRecommendation: heightRecommendations.faceUnstable,
      },
    }
  }

  if (
    !top.confirmedPrimaryFace ||
    top.primaryIdentityChanged ||
    top.reacquiring ||
    globalState.rawBlockingState === 'reacquiring'
  ) {
    return {
      rawHeightRecommendation: heightRecommendations.reacquiring,
      imageObservation: imageVerticalObservations.unavailable,
      reason: 'reacquiring',
      dataAgeMs,
      faceValid: false,
      stable: false,
      diagnostics: {
        ...diagnostics,
        rawHeightRecommendation: heightRecommendations.reacquiring,
      },
    }
  }

  if (!diagnostics.eyesAvailable) {
    return {
      rawHeightRecommendation: heightRecommendations.reacquiring,
      imageObservation: imageVerticalObservations.unavailable,
      reason: 'eye_landmarks_unavailable',
      dataAgeMs,
      faceValid: false,
      stable: false,
      diagnostics: {
        ...diagnostics,
        rawHeightRecommendation: heightRecommendations.reacquiring,
      },
    }
  }

  if (!diagnostics.insideRoi) {
    return {
      rawHeightRecommendation: heightRecommendations.faceUnstable,
      imageObservation: imageVerticalObservations.unavailable,
      reason: 'face_outside_roi',
      dataAgeMs,
      faceValid: false,
      stable: false,
      eyeCenterY: top.eyeCenterY,
      targetEyeY: config.targetEyeY,
      verticalError: top.eyeCenterY - config.targetEyeY,
      eyeCenterMethod: top.eyeCenterMethod,
      diagnostics: {
        ...diagnostics,
        rawHeightRecommendation: heightRecommendations.faceUnstable,
      },
    }
  }

  if (!diagnostics.faceSizeValid) {
    return {
      rawHeightRecommendation: heightRecommendations.faceUnstable,
      imageObservation: imageVerticalObservations.unavailable,
      reason: 'face_too_small_for_height',
      dataAgeMs,
      faceValid: false,
      stable: false,
      eyeCenterY: top.eyeCenterY,
      targetEyeY: config.targetEyeY,
      verticalError: top.eyeCenterY - config.targetEyeY,
      eyeCenterMethod: top.eyeCenterMethod,
      diagnostics: {
        ...diagnostics,
        rawHeightRecommendation: heightRecommendations.faceUnstable,
      },
    }
  }

  if (!diagnostics.poseValid) {
    return {
      rawHeightRecommendation: heightRecommendations.faceUnstable,
      imageObservation: imageVerticalObservations.unavailable,
      reason: 'pose_invalid_for_height',
      dataAgeMs,
      faceValid: false,
      stable: false,
      eyeCenterY: top.eyeCenterY,
      targetEyeY: config.targetEyeY,
      verticalError: top.eyeCenterY - config.targetEyeY,
      eyeCenterMethod: top.eyeCenterMethod,
      diagnostics: {
        ...diagnostics,
        rawHeightRecommendation: heightRecommendations.faceUnstable,
      },
    }
  }

  if (!diagnostics.stable) {
    return {
      rawHeightRecommendation: heightRecommendations.faceUnstable,
      imageObservation: imageVerticalObservations.unavailable,
      reason: 'face_unstable_for_height',
      dataAgeMs,
      faceValid: true,
      stable: false,
      eyeCenterY: top.eyeCenterY,
      targetEyeY: config.targetEyeY,
      verticalError: top.eyeCenterY - config.targetEyeY,
      eyeCenterMethod: top.eyeCenterMethod,
      diagnostics: {
        ...diagnostics,
        faceValid: true,
        rawHeightRecommendation: heightRecommendations.faceUnstable,
      },
    }
  }

  const verticalError = top.eyeCenterY - config.targetEyeY

  return {
    dataAgeMs,
    eyeCenterMethod: top.eyeCenterMethod,
    eyeCenterY: top.eyeCenterY,
    faceValid: true,
    reason: null,
    stable: true,
    targetEyeY: config.targetEyeY,
    verticalError,
    diagnostics: {
      ...diagnostics,
      faceValid: true,
      rawHeightRecommendation: heightRecommendations.reacquiring,
      stable: true,
    },
  }
}

function createInitialHeightObservationState(config = heightObservationConfig) {
  return {
    dataAgeMs: null,
    displayedHeightRecommendation:
      heightRecommendations.reacquiring,
    diagnostics: createDiagnostics(),
    eyeCenterMethod: null,
    eyeCenterY: null,
    faceValid: false,
    imageObservation: imageVerticalObservations.unavailable,
    pendingRecommendation: null,
    pendingRecommendationAgeMs: 0,
    rawHeightRecommendation: heightRecommendations.reacquiring,
    reason: 'initializing',
    stable: false,
    stableDurationMs: 0,
    stableSampleCount: 0,
    targetEyeY: config.targetEyeY,
    updatedAt: 0,
    verticalError: null,
  }
}

function createHeightObservationAnalyzer({
  config = heightObservationConfig,
} = {}) {
  let state = createInitialHeightObservationState(config)
  let validSince = null
  let stableSampleCount = 0
  let pendingRecommendation = null
  let pendingRecommendationSince = null
  let displayedAt = 0

  const resetValidity = () => {
    validSince = null
    stableSampleCount = 0
  }

  const updateDisplayRecommendation = (rawRecommendation, now) => {
    if (
      rawRecommendation === state.displayedHeightRecommendation
    ) {
      pendingRecommendation = null
      pendingRecommendationSince = null
      return state.displayedHeightRecommendation
    }

    if (pendingRecommendation !== rawRecommendation) {
      pendingRecommendation = rawRecommendation
      pendingRecommendationSince = now
    }

    const pendingAge = now - pendingRecommendationSince
    const displayedLongEnough =
      displayedAt === 0 ||
      now - displayedAt >= config.minimumRecommendationDisplayMs

    if (
      pendingAge >= config.recommendationConfirmationMs &&
      displayedLongEnough
    ) {
      displayedAt = now
      pendingRecommendation = null
      pendingRecommendationSince = null
      return rawRecommendation
    }

    return state.displayedHeightRecommendation
  }

  const update = (globalState, now = performance.now()) => {
    const candidate = getPrimaryHeightCandidate(
      globalState,
      now,
      config,
    )

    if (!candidate.faceValid || !candidate.stable) {
      resetValidity()
      const displayedHeightRecommendation =
        updateDisplayRecommendation(
          candidate.rawHeightRecommendation,
          now,
        )

      state = {
        ...state,
        ...candidate,
        displayedHeightRecommendation,
        diagnostics: {
          ...candidate.diagnostics,
          displayedHeightRecommendation,
          stableSamples: 0,
        },
        pendingRecommendation,
        pendingRecommendationAgeMs:
          pendingRecommendationSince === null
            ? 0
            : Math.max(0, now - pendingRecommendationSince),
        stableDurationMs: 0,
        stableSampleCount: 0,
        targetEyeY: config.targetEyeY,
        updatedAt: now,
      }
      return state
    }

    validSince ??= now
    stableSampleCount += 1
    const stableDurationMs = now - validSince
    const stableEnough =
      stableSampleCount >= config.minimumStableSamples &&
      stableDurationMs >= config.minimumStableDurationMs

    let rawHeightRecommendation = heightRecommendations.reacquiring
    let imageObservation = imageVerticalObservations.unavailable

    if (stableEnough) {
      imageObservation = getImageObservationFromError(
        candidate.verticalError,
        state.rawHeightRecommendation,
        config,
      )
      rawHeightRecommendation =
        getPhysicalRecommendationFromImageObservation(
          imageObservation,
          config.cameraVerticalDirection,
        )
    }

    const displayedHeightRecommendation =
      updateDisplayRecommendation(rawHeightRecommendation, now)

    state = {
      ...state,
      ...candidate,
      displayedHeightRecommendation,
      imageObservation,
      pendingRecommendation,
      pendingRecommendationAgeMs:
        pendingRecommendationSince === null
          ? 0
          : Math.max(0, now - pendingRecommendationSince),
      rawHeightRecommendation,
      reason: stableEnough ? null : 'minimum_stability_required',
      stable: stableEnough,
      stableDurationMs,
      stableSampleCount,
      targetEyeY: config.targetEyeY,
      updatedAt: now,
      diagnostics: {
        ...candidate.diagnostics,
        displayedHeightRecommendation,
        rawHeightRecommendation,
        stable: stableEnough,
        stableSamples: stableSampleCount,
      },
    }
    return state
  }

  const reset = () => {
    state = createInitialHeightObservationState(config)
    validSince = null
    stableSampleCount = 0
    pendingRecommendation = null
    pendingRecommendationSince = null
    displayedAt = 0
  }

  return {
    getState: () => state,
    reset,
    update,
  }
}

export {
  createHeightObservationAnalyzer,
  createInitialHeightObservationState,
  getImageObservationFromError,
  getPhysicalRecommendationFromImageObservation,
  heightRecommendations,
  imageVerticalObservations,
}
