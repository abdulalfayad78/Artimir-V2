import positioningConfig, {
  cameraIds,
} from '../config/positioningConfig.js'
import {
  createCameraResult,
  createInitialCameraResults,
  isCameraResultFresh,
} from './cameraResult.js'
import createCameraMeasurementFilter from './cameraMeasurementFilter.js'
import { selectPositioningFaces } from './faceSelection.js'
import { createPrimaryFaceTracker } from './primaryFaceTracker.js'

const positioningInstructions = Object.freeze({
  primaryUnavailable: 'primary_camera_unavailable',
  detectionError: 'detection_error',
  invalidData: 'invalid_data',
  faceNotDetected: 'face_not_detected',
  faceOutsideRoi: 'face_outside_roi',
  multipleFaces: 'multiple_faces',
  dataStale: 'data_stale',
  reacquiring: 'reacquiring',
  tooFar: 'too_far',
  tooClose: 'too_close',
  moveLeft: 'move_left',
  moveRight: 'move_right',
  moveUp: 'move_up',
  moveDown: 'move_down',
  straightenHead: 'straighten_head',
  lookForward: 'look_forward',
  lowerHead: 'lower_head',
  raiseHead: 'raise_head',
  movementTooHigh: 'movement_too_high',
  secondaryBlocked: 'secondary_blocked',
  holdStill: 'hold_still',
  positionCorrect: 'position_correct',
})

const criticalInstructions = new Set([
  positioningInstructions.primaryUnavailable,
  positioningInstructions.detectionError,
  positioningInstructions.invalidData,
  positioningInstructions.faceNotDetected,
  positioningInstructions.faceOutsideRoi,
  positioningInstructions.multipleFaces,
  positioningInstructions.dataStale,
])

function outsideWithHysteresis(
  value,
  limit,
  direction,
  instruction,
  previousInstruction,
  hysteresisRatio,
) {
  const activeLimit =
    previousInstruction === instruction
      ? limit * (1 - hysteresisRatio)
      : limit

  return direction === 'negative'
    ? value < -activeLimit
    : value > activeLimit
}

function outsideDistanceRangeWithHysteresis(
  value,
  limit,
  direction,
  instruction,
  previousInstruction,
  hysteresisMargin,
) {
  const activeLimit =
    previousInstruction === instruction
      ? direction === 'minimum'
        ? limit + hysteresisMargin
        : limit - hysteresisMargin
      : limit

  return direction === 'minimum'
    ? value < activeLimit
    : value > activeLimit
}

function absoluteOutsideWithHysteresis(
  value,
  limit,
  instruction,
  previousInstruction,
  hysteresisRatio,
) {
  const activeLimit =
    previousInstruction === instruction
      ? limit * (1 - hysteresisRatio)
      : limit

  return Math.abs(value) > activeLimit
}

function evaluateCameraUsability(
  result,
  thresholds,
  now,
  config,
) {
  if (!result.available) {
    return { usable: false, reason: 'camera_unavailable' }
  }

  if (
    !isCameraResultFresh(
      result,
      now,
      config.analysis.maxDataAgeMs,
    )
  ) {
    return { usable: false, reason: 'data_stale' }
  }

  if (result.totalFaceCount === 0) {
    return { usable: false, reason: 'face_not_detected' }
  }

  if (result.relevantFaceCount > 1) {
    return { usable: false, reason: 'multiple_faces' }
  }

  if (result.relevantFaceCount === 0) {
    return {
      usable: false,
      reason:
        result.rawRoiFaceCount > 0
          ? 'invalid_data'
          : 'face_outside_roi',
    }
  }

  if (!result.faceDetected) {
    return { usable: false, reason: 'reacquiring' }
  }

  if (result.reacquiring) {
    return { usable: false, reason: 'reacquiring' }
  }

  if (
    (result.confidenceAvailable
      ? result.confidence < thresholds.minDetectionConfidence
      : !result.passedInternalConfidenceThresholds) ||
    !result.landmarksAvailable ||
    !result.essentialLandmarksPresent
  ) {
    return { usable: false, reason: 'landmarks_incomplete' }
  }

  if (
    [
      result.centerX,
      result.centerY,
      result.faceWidthRatio,
      result.faceHeightRatio,
      result.roll,
      result.yaw,
      result.pitch,
      result.centerMovementRatio,
      result.sizeVariationRatio,
      result.angleVariationDegrees,
    ].some((value) => !Number.isFinite(value))
  ) {
    return { usable: false, reason: 'measurements_incomplete' }
  }

  if (!result.withinFrame) {
    return { usable: false, reason: 'face_out_of_frame' }
  }

  if (
    result.faceWidthRatio < thresholds.minFaceWidthRatio ||
    result.faceWidthRatio > thresholds.maxFaceWidthRatio
  ) {
    return { usable: false, reason: 'face_size_invalid' }
  }

  if (
    Math.abs(result.roll) > thresholds.maxRollDegrees ||
    Math.abs(result.yaw) > thresholds.maxYawDegrees ||
    Math.abs(result.pitch) > thresholds.maxPitchDegrees
  ) {
    return { usable: false, reason: 'pose_invalid' }
  }

  if (
    result.centerMovementRatio >
      thresholds.maxCenterMovementRatio ||
    result.sizeVariationRatio >
      thresholds.maxSizeVariationRatio ||
    result.angleVariationDegrees >
      thresholds.maxAngleVariationDegrees
  ) {
    return { usable: false, reason: 'movement_too_high' }
  }

  if (!Object.values(result.overlapRegions).every(Boolean)) {
    return { usable: false, reason: 'overlap_regions_incomplete' }
  }

  return { usable: true, reason: null }
}

function getCandidateInstruction(
  top,
  topUsability,
  previousInstruction,
  now,
  config,
  detectionFailed,
) {
  const thresholds = config.cameraThresholds.top
  const hysteresis = config.filtering.hysteresisRatio

  if (detectionFailed) {
    return positioningInstructions.detectionError
  }

  if (!top.available) {
    return positioningInstructions.primaryUnavailable
  }

  if (
    !isCameraResultFresh(
      top,
      now,
      config.analysis.maxDataAgeMs,
    )
  ) {
    return positioningInstructions.dataStale
  }

  if (top.totalFaceCount === 0) {
    return positioningInstructions.faceNotDetected
  }

  if (top.relevantFaceCount > 1) {
    return positioningInstructions.multipleFaces
  }

  if (top.relevantFaceCount === 0) {
    return top.rawRoiFaceCount > 0
      ? positioningInstructions.invalidData
      : positioningInstructions.faceOutsideRoi
  }

  if (
    !top.faceDetected ||
    top.primaryIdentityChanged ||
    top.reacquiring
  ) {
    return positioningInstructions.reacquiring
  }

  if (
    outsideDistanceRangeWithHysteresis(
      top.faceWidthRatio,
      thresholds.minFaceWidthRatio,
      'minimum',
      positioningInstructions.tooFar,
      previousInstruction,
      thresholds.distanceHysteresisMargin,
    )
  ) {
    return positioningInstructions.tooFar
  }

  if (
    outsideDistanceRangeWithHysteresis(
      top.faceWidthRatio,
      thresholds.maxFaceWidthRatio,
      'maximum',
      positioningInstructions.tooClose,
      previousInstruction,
      thresholds.distanceHysteresisMargin,
    )
  ) {
    return positioningInstructions.tooClose
  }

  const horizontalOffset = top.centerX - config.targetCenter.x

  if (
    outsideWithHysteresis(
      horizontalOffset,
      thresholds.horizontalTolerance,
      'negative',
      positioningInstructions.moveLeft,
      previousInstruction,
      hysteresis,
    )
  ) {
    return positioningInstructions.moveLeft
  }

  if (
    outsideWithHysteresis(
      horizontalOffset,
      thresholds.horizontalTolerance,
      'positive',
      positioningInstructions.moveRight,
      previousInstruction,
      hysteresis,
    )
  ) {
    return positioningInstructions.moveRight
  }

  const verticalOffset = top.centerY - config.targetCenter.y

  if (
    outsideWithHysteresis(
      verticalOffset,
      thresholds.verticalTolerance,
      'negative',
      positioningInstructions.moveDown,
      previousInstruction,
      hysteresis,
    )
  ) {
    return positioningInstructions.moveDown
  }

  if (
    outsideWithHysteresis(
      verticalOffset,
      thresholds.verticalTolerance,
      'positive',
      positioningInstructions.moveUp,
      previousInstruction,
      hysteresis,
    )
  ) {
    return positioningInstructions.moveUp
  }

  if (
    absoluteOutsideWithHysteresis(
      top.roll,
      thresholds.maxRollDegrees,
      positioningInstructions.straightenHead,
      previousInstruction,
      hysteresis,
    )
  ) {
    return positioningInstructions.straightenHead
  }

  if (
    absoluteOutsideWithHysteresis(
      top.yaw,
      thresholds.maxYawDegrees,
      positioningInstructions.lookForward,
      previousInstruction,
      hysteresis,
    )
  ) {
    return positioningInstructions.lookForward
  }

  if (
    outsideWithHysteresis(
      top.pitch,
      thresholds.maxPitchDegrees,
      'positive',
      positioningInstructions.raiseHead,
      previousInstruction,
      hysteresis,
    )
  ) {
    return positioningInstructions.raiseHead
  }

  if (
    outsideWithHysteresis(
      top.pitch,
      thresholds.maxPitchDegrees,
      'negative',
      positioningInstructions.lowerHead,
      previousInstruction,
      hysteresis,
    )
  ) {
    return positioningInstructions.lowerHead
  }

  if (
    !topUsability.usable &&
    topUsability.reason === 'movement_too_high'
  ) {
    return positioningInstructions.movementTooHigh
  }

  if (!topUsability.usable) {
    return positioningInstructions.secondaryBlocked
  }

  return positioningInstructions.holdStill
}

function prepareCameraMeasurement(
  cameraResult,
  config,
  faceTracker,
) {
  const selection = selectPositioningFaces(cameraResult, config)
  const tracking = faceTracker.update(selection)
  const primary = tracking.confirmedPrimaryFace
  const thresholds =
    config.cameraThresholds[cameraResult.cameraId]
  const edgeMargin = thresholds.edgeMarginRatio
  const withinFrame = Boolean(
    primary?.trackingBox &&
      primary.trackingBox.x >= edgeMargin &&
      primary.trackingBox.y >= edgeMargin &&
      primary.trackingBox.x + primary.trackingBox.width <=
        1 - edgeMargin &&
      primary.trackingBox.y + primary.trackingBox.height <=
        1 - edgeMargin,
  )

  return createCameraResult(cameraResult.cameraId, {
    available: cameraResult.available,
    simulated: cameraResult.simulated,
    timestamp: cameraResult.timestamp,
    faces: selection.faces,
    totalFaceCount: selection.totalFaceCount,
    roiFaceCount: selection.roiFaceCount,
    rawRoiFaceCount: selection.rawRoiFaceCount,
    relevantFaceCount: selection.relevantFaceCount,
    ignoredBackgroundFaceCount:
      selection.ignoredBackgroundFaceCount,
    rejectedFaceCount: selection.rejectedFaceCount,
    confirmedFaceCount: tracking.confirmedFaceCount,
    secondaryToPrimaryAreaRatio:
      selection.secondaryToPrimaryAreaRatio,
    primaryToSecondaryAreaRatio:
      selection.primaryToSecondaryAreaRatio,
    faceCount: selection.relevantFaceCount,
    faceDetected: Boolean(primary),
    primaryFaceSourceIndex: primary?.sourceIndex ?? null,
    candidatePrimaryFace: tracking.candidatePrimaryFace,
    confirmedPrimaryFace: tracking.confirmedPrimaryFace,
    primaryIdentityChanged: tracking.identityChanged,
    multipleFacesCoherent: tracking.multipleFacesCoherent,
    multipleFaceSampleCount: tracking.multipleFaceSampleCount,
    primaryCandidateSampleCount: tracking.candidateSampleCount,
    faceTrackingCoherence: tracking.coherence ?? null,
    ...(primary ?? {}),
    confidenceAvailable:
      primary?.confidenceAvailable ??
      Number.isFinite(primary?.confidence),
    confidenceSource:
      primary?.confidenceSource ??
      (Number.isFinite(primary?.confidence)
        ? 'provided_score'
        : 'unavailable'),
    passedInternalConfidenceThresholds:
      primary?.passedInternalConfidenceThresholds ?? false,
    rawFaceWidthRatio: primary?.faceWidthRatio ?? null,
    withinFrame,
  })
}

function getDisplayedValidation(instruction, positionCorrect) {
  const faceBlocked = new Set([
    positioningInstructions.primaryUnavailable,
    positioningInstructions.detectionError,
    positioningInstructions.invalidData,
    positioningInstructions.faceNotDetected,
    positioningInstructions.faceOutsideRoi,
    positioningInstructions.multipleFaces,
    positioningInstructions.dataStale,
    positioningInstructions.reacquiring,
  ])
  const distanceBlocked = new Set([
    ...faceBlocked,
    positioningInstructions.tooFar,
    positioningInstructions.tooClose,
  ])
  const centerBlocked = new Set([
    ...distanceBlocked,
    positioningInstructions.moveLeft,
    positioningInstructions.moveRight,
    positioningInstructions.moveUp,
    positioningInstructions.moveDown,
  ])
  const orientationBlocked = new Set([
    ...centerBlocked,
    positioningInstructions.straightenHead,
    positioningInstructions.lookForward,
    positioningInstructions.lowerHead,
    positioningInstructions.raiseHead,
  ])

  return {
    face: !faceBlocked.has(instruction),
    distance: !distanceBlocked.has(instruction),
    center: !centerBlocked.has(instruction),
    orientation: !orientationBlocked.has(instruction),
    stillness:
      instruction === positioningInstructions.holdStill ||
      positionCorrect,
  }
}

function createMultiCameraAggregator(
  config = positioningConfig,
) {
  let cameras = createInitialCameraResults(config.cameraMode)
  let stableSince = null
  let validMeasurementCount = 0
  let confirmedInstruction =
    positioningInstructions.primaryUnavailable
  let confirmedInstructionAt = 0
  let pendingInstruction = null
  let pendingInstructionSince = null
  let pendingInstructionSamples = 0
  let recoveryRequired = false
  let lastRawInstruction = null
  let rawInstructionSampleCount = 0
  let lastRenderedInstruction = confirmedInstruction
  let lastRenderedInstructionAt = 0
  let progressResetReason = 'initial_state'
  let detectionFailed = false
  const filters = Object.fromEntries(
    cameraIds.map((cameraId) => [
      cameraId,
      createCameraMeasurementFilter(config),
    ]),
  )
  const faceTrackers = Object.fromEntries(
    cameraIds.map((cameraId) => [
      cameraId,
      createPrimaryFaceTracker(config),
    ]),
  )

  const resetStability = (reason) => {
    stableSince = null
    validMeasurementCount = 0
    progressResetReason = reason
  }

  const resetInstructionConfirmation = () => {
    pendingInstruction = null
    pendingInstructionSince = null
    pendingInstructionSamples = 0
  }

  const reset = () => {
    cameras = createInitialCameraResults(config.cameraMode)
    cameraIds.forEach((cameraId) => filters[cameraId].reset())
    cameraIds.forEach((cameraId) =>
      faceTrackers[cameraId].reset(),
    )
    stableSince = null
    validMeasurementCount = 0
    confirmedInstruction =
      positioningInstructions.primaryUnavailable
    confirmedInstructionAt = 0
    progressResetReason = 'manual_reset'
    detectionFailed = false
    recoveryRequired = false
    lastRawInstruction = null
    rawInstructionSampleCount = 0
    lastRenderedInstruction = confirmedInstruction
    lastRenderedInstructionAt = 0
    resetInstructionConfirmation()
  }

  const getDisplayConfirmation = (instruction) => {
    if (!criticalInstructions.has(instruction)) {
      return {
        samples:
          config.filtering.nonCriticalDisplayConfirmSamples,
        durationMs:
          config.filtering.nonCriticalDisplayConfirmMs,
      }
    }

    const durationMs =
      instruction === positioningInstructions.multipleFaces
        ? config.filtering.multipleFacesDisplayConfirmMs
        : instruction === positioningInstructions.faceNotDetected
          ? config.filtering.noFaceDisplayConfirmMs
          : config.filtering.criticalDisplayConfirmMs

    return {
      samples: config.filtering.criticalDisplayConfirmSamples,
      durationMs,
    }
  }

  const confirmInstruction = (
    nextCandidate,
    now,
    countMeasurement,
    top,
  ) => {
    if (
      nextCandidate === confirmedInstruction &&
      !recoveryRequired
    ) {
      resetInstructionConfirmation()
      return confirmedInstruction
    }

    if (
      confirmedInstruction === positioningInstructions.holdStill &&
      nextCandidate !== positioningInstructions.holdStill
    ) {
      recoveryRequired = true
    }

    const candidateCanBeDisplayed =
      nextCandidate !== positioningInstructions.multipleFaces ||
      top.multipleFacesCoherent
    const shouldCountObservation =
      countMeasurement || criticalInstructions.has(nextCandidate)

    if (candidateCanBeDisplayed && shouldCountObservation) {
      if (pendingInstruction === nextCandidate) {
        pendingInstructionSamples += 1
      } else {
        pendingInstruction = nextCandidate
        pendingInstructionSince = now
        pendingInstructionSamples = 1
      }
    } else if (!candidateCanBeDisplayed) {
      resetInstructionConfirmation()
    }

    const confirmation = getDisplayConfirmation(nextCandidate)
    const candidateObservedLongEnough =
      pendingInstruction === nextCandidate &&
      pendingInstructionSamples >=
        confirmation.samples &&
      now - pendingInstructionSince >=
        confirmation.durationMs
    const currentDisplayedLongEnough =
      confirmedInstructionAt === 0 ||
      now - confirmedInstructionAt >=
        config.filtering.minimumDisplayedInstructionMs

    if (
      candidateObservedLongEnough &&
      currentDisplayedLongEnough
    ) {
      confirmedInstruction = nextCandidate
      confirmedInstructionAt = now
      recoveryRequired = false
      resetInstructionConfirmation()
      return confirmedInstruction
    }

    if (
      confirmedInstruction === positioningInstructions.holdStill ||
      confirmedInstruction ===
        positioningInstructions.positionCorrect ||
      recoveryRequired
    ) {
      return positioningInstructions.reacquiring
    }

    return confirmedInstruction
  }

  const calculateState = (now, countMeasurement = false) => {
    const evaluatedCameras = Object.fromEntries(
      cameraIds.map((cameraId) => {
        const camera = cameras[cameraId]
        const fresh = isCameraResultFresh(
          camera,
          now,
          config.analysis.maxDataAgeMs,
        )
        const evaluation = evaluateCameraUsability(
          camera,
          config.cameraThresholds[cameraId],
          now,
          config,
        )
        const visibleCamera =
          camera.timestamp > 0 && !fresh
            ? createCameraResult(cameraId, {
                available: camera.available,
                simulated: camera.simulated,
                timestamp: camera.timestamp,
              })
            : camera

        if (camera.timestamp > 0 && !fresh) {
          filters[cameraId].reset()
          faceTrackers[cameraId].reset()
        }

        return [
          cameraId,
          {
            ...visibleCamera,
            dataAgeMs:
              camera.timestamp > 0
                ? Math.max(0, now - camera.timestamp)
                : null,
            usableForMapping: evaluation.usable,
            blockingReason: evaluation.reason,
          },
        ]
      }),
    )
    const top = evaluatedCameras[config.primaryCameraId]
    const topUsability = {
      usable: top.usableForMapping,
      reason: top.blockingReason,
    }
    const nextCandidateInstruction = getCandidateInstruction(
      top,
      topUsability,
      confirmedInstruction,
      now,
      config,
      detectionFailed,
    )
    const requiredCameraIds =
      config.cameraMode === 'multi'
        ? cameraIds
        : [config.primaryCameraId]
    const secondaryBlockingCamera = requiredCameraIds
      .filter((cameraId) => cameraId !== config.primaryCameraId)
      .find(
        (cameraId) =>
          !evaluatedCameras[cameraId].usableForMapping,
      )
    const allRequiredCamerasReady = requiredCameraIds.every(
      (cameraId) => evaluatedCameras[cameraId].usableForMapping,
    )
    const effectiveCandidateInstruction =
      nextCandidateInstruction ===
        positioningInstructions.holdStill &&
      secondaryBlockingCamera
        ? positioningInstructions.secondaryBlocked
        : nextCandidateInstruction
    const candidateReady =
      effectiveCandidateInstruction ===
        positioningInstructions.holdStill &&
      allRequiredCamerasReady
    const rawBlockingState = candidateReady
      ? null
      : effectiveCandidateInstruction

    if (effectiveCandidateInstruction === lastRawInstruction) {
      rawInstructionSampleCount += 1
    } else {
      lastRawInstruction = effectiveCandidateInstruction
      rawInstructionSampleCount = 1
    }

    let primaryInstruction = confirmInstruction(
      effectiveCandidateInstruction,
      now,
      countMeasurement,
      top,
    )

    if (candidateReady && countMeasurement) {
      validMeasurementCount += 1
    } else if (!candidateReady) {
      resetStability(effectiveCandidateInstruction)
    }

    if (
      candidateReady &&
      primaryInstruction === positioningInstructions.holdStill &&
      validMeasurementCount >=
        config.filtering.minimumValidMeasurements
    ) {
      stableSince ??= now
    } else if (
      primaryInstruction !== positioningInstructions.holdStill
    ) {
      stableSince = null
    }

    const stableDurationMs =
      stableSince === null ? 0 : Math.max(0, now - stableSince)
    const stableProgress =
      validMeasurementCount >=
        config.filtering.minimumValidMeasurements &&
      stableSince !== null
        ? Math.min(
            1,
            stableDurationMs /
              config.filtering.stableDurationMs,
          )
        : 0
    const positionCorrect =
      candidateReady &&
      rawBlockingState === null &&
      primaryInstruction === positioningInstructions.holdStill &&
      stableProgress >= 1 &&
      validMeasurementCount >=
        config.filtering.minimumValidMeasurements

    if (positionCorrect) {
      primaryInstruction =
        positioningInstructions.positionCorrect
    }

    if (primaryInstruction !== lastRenderedInstruction) {
      lastRenderedInstruction = primaryInstruction
      lastRenderedInstructionAt = now
    }

    const instructionConfirmed =
      primaryInstruction === confirmedInstruction ||
      positionCorrect
    const blockingReason = positionCorrect
      ? null
      : rawBlockingState
    const thresholds = config.cameraThresholds.top
    const faceValid =
      top.available &&
      isCameraResultFresh(
        top,
        now,
        config.analysis.maxDataAgeMs,
      ) &&
      top.faceDetected &&
      top.relevantFaceCount === 1
    const distanceValid =
      faceValid &&
      top.faceWidthRatio >= thresholds.minFaceWidthRatio &&
      top.faceWidthRatio <= thresholds.maxFaceWidthRatio
    const centerValid =
      distanceValid &&
      Math.abs(top.centerX - config.targetCenter.x) <=
        thresholds.horizontalTolerance &&
      Math.abs(top.centerY - config.targetCenter.y) <=
        thresholds.verticalTolerance
    const orientationValid =
      centerValid &&
      Math.abs(top.roll) <= thresholds.maxRollDegrees &&
      Math.abs(top.yaw) <= thresholds.maxYawDegrees &&
      Math.abs(top.pitch) <= thresholds.maxPitchDegrees
    const stabilityValid =
      orientationValid &&
      top.usableForMapping &&
      blockingReason === null
    const displayedValidation = getDisplayedValidation(
      primaryInstruction,
      positionCorrect,
    )

    return {
      mode: config.cameraMode,
      primaryCameraId: config.primaryCameraId,
      cameras: evaluatedCameras,
      allRequiredCamerasReady,
      candidateInstruction:
        pendingInstruction ?? effectiveCandidateInstruction,
      confirmedInstruction,
      primaryInstruction,
      rawInstruction: effectiveCandidateInstruction,
      rawBlockingState,
      displayedInstruction: primaryInstruction,
      displayedInstructionAgeMs:
        lastRenderedInstructionAt === 0
          ? 0
          : Math.max(0, now - lastRenderedInstructionAt),
      rawInstructionSampleCount,
      instructionConfirmed,
      instructionConfirmationSamples:
        pendingInstruction === effectiveCandidateInstruction
          ? pendingInstructionSamples
          : 0,
      instructionConfirmationAgeMs:
        pendingInstructionSince === null
          ? 0
          : Math.max(0, now - pendingInstructionSince),
      stableProgress,
      holdStillStartedAt: stableSince,
      holdStillElapsedMs: stableDurationMs,
      holdStillRequiredMs: config.filtering.stableDurationMs,
      stableDurationMs,
      validMeasurementCount,
      progressResetReason,
      blockingCameraId:
        secondaryBlockingCamera ??
        (top.blockingReason ? config.primaryCameraId : null),
      blockingReason,
      positionCorrect,
      rawValidation: {
        face: faceValid,
        distance: distanceValid,
        center: centerValid,
        orientation: orientationValid,
        stillness: stabilityValid,
      },
      validation: displayedValidation,
      timestamp: now,
    }
  }

  const update = (cameraResult, now = cameraResult.timestamp) => {
    const cameraId = cameraResult.cameraId

    if (!cameraIds.includes(cameraId)) {
      throw new Error(`Unknown positioning camera: ${cameraId}`)
    }

    detectionFailed = false
    const measurement = prepareCameraMeasurement(
      cameraResult,
      config,
      faceTrackers[cameraId],
    )
    cameras[cameraId] = filters[cameraId].update(
      measurement,
      config.cameraThresholds[cameraId],
    )

    return calculateState(now, true)
  }

  const fail = (now) => {
    detectionFailed = true
    cameras = createInitialCameraResults(config.cameraMode)
    cameraIds.forEach((cameraId) => filters[cameraId].reset())
    cameraIds.forEach((cameraId) =>
      faceTrackers[cameraId].reset(),
    )
    resetStability(positioningInstructions.detectionError)
    return calculateState(now, false)
  }

  return {
    fail,
    getState: (now) => calculateState(now, false),
    reset,
    update,
  }
}

function getGlobalPositionCriteria(state) {
  const definitions = [
    { id: 'face', valid: state.validation.face },
    { id: 'distance', valid: state.validation.distance },
    { id: 'center', valid: state.validation.center },
    {
      id: 'orientation',
      valid: state.validation.orientation,
    },
    {
      id: 'stillness',
      valid: state.positionCorrect,
      current:
        state.validation.stillness &&
        state.primaryInstruction ===
          positioningInstructions.holdStill,
    },
  ]

  return definitions.map((criterion, index) => {
    const previousCriteriaValid = definitions
      .slice(0, index)
      .every(({ valid }) => valid)
    let criterionState = 'waiting'

    if (criterion.valid) {
      criterionState = 'valid'
    } else if (criterion.current || previousCriteriaValid) {
      criterionState = 'current'
    }

    return {
      id: criterion.id,
      state: criterionState,
    }
  })
}

function createDiagnosticDemoState(state, primaryInstruction) {
  const blockingReason =
    primaryInstruction === positioningInstructions.holdStill ||
    primaryInstruction === positioningInstructions.positionCorrect
      ? null
      : primaryInstruction

  return {
    ...state,
    candidateInstruction: primaryInstruction,
    confirmedInstruction: primaryInstruction,
    primaryInstruction,
    rawInstruction: primaryInstruction,
    rawBlockingState: blockingReason,
    displayedInstruction: primaryInstruction,
    stableProgress: 0,
    stableDurationMs: 0,
    validMeasurementCount: 0,
    blockingReason,
    positionCorrect: false,
  }
}

export {
  createDiagnosticDemoState,
  createMultiCameraAggregator,
  evaluateCameraUsability,
  getGlobalPositionCriteria,
  positioningInstructions,
  prepareCameraMeasurement,
}
