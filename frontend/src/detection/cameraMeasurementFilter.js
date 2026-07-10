const filteredFields = [
  'centerX',
  'centerY',
  'faceWidthRatio',
  'faceHeightRatio',
  'roll',
  'yaw',
  'pitch',
]

function smoothValue(previous, current, factor) {
  if (!Number.isFinite(previous)) {
    return current
  }

  if (!Number.isFinite(current)) {
    return previous
  }

  return previous * (1 - factor) + current * factor
}

function median(values) {
  const finiteValues = values
    .filter((value) => Number.isFinite(value))
    .sort((first, second) => first - second)

  if (finiteValues.length === 0) {
    return null
  }

  const middle = Math.floor(finiteValues.length / 2)

  return finiteValues.length % 2 === 0
    ? (finiteValues[middle - 1] + finiteValues[middle]) / 2
    : finiteValues[middle]
}

function isRetainableShortLoss(measurement) {
  return (
    measurement.totalFaceCount === 0 ||
    (!measurement.faceDetected &&
      measurement.relevantFaceCount <= 1) ||
    (measurement.faceCount === 1 &&
      !measurement.essentialLandmarksPresent)
  )
}

function createCameraMeasurementFilter(config) {
  let previous = null
  let lossStartedAt = null
  let requiresBaseline = true
  let history = []

  const reset = () => {
    previous = null
    lossStartedAt = null
    requiresBaseline = true
    history = []
  }

  const update = (measurement, thresholds) => {
    if (
      !measurement.faceDetected ||
      measurement.faceCount !== 1 ||
      !measurement.essentialLandmarksPresent
    ) {
      lossStartedAt ??= measurement.timestamp

      const lostDurationMs = measurement.timestamp - lossStartedAt
      const canRetainPreviousFace =
        previous &&
        isRetainableShortLoss(measurement) &&
        lostDurationMs < config.analysis.noFaceRetentionMs

      if (canRetainPreviousFace) {
        return {
          ...previous,
          available: measurement.available,
          simulated: measurement.simulated,
          timestamp: measurement.timestamp,
          rawFaceDetected: measurement.faceDetected,
          retainedDuringDetectionGrace: true,
          lostDetectionDurationMs: lostDurationMs,
          lastValidDetectionAgeMs: lostDurationMs,
          dataQuality: 'retained_short_loss',
        }
      }

      if (
        lostDurationMs >= config.analysis.noFaceRetentionMs
      ) {
        previous = null
        history = []
      }

      requiresBaseline = true
      return {
        ...measurement,
        centerMovementRatio: null,
        sizeVariationRatio: null,
        angleVariationDegrees: null,
        stability: 0,
        reacquiring: true,
        retainedDuringDetectionGrace: false,
        lostDetectionDurationMs: lossStartedAt
          ? measurement.timestamp - lossStartedAt
          : 0,
        lastValidDetectionAgeMs: null,
        dataQuality: 'raw_invalid',
      }
    }

    const filtered = { ...measurement }
    const nextHistory = [
      ...history,
      Object.fromEntries(
        filteredFields.map((field) => [
          field,
          measurement[field],
        ]),
      ),
    ].slice(-config.filtering.historySize)

    filteredFields.forEach((field) => {
      const medianValue = median(
        nextHistory.map((entry) => entry[field]),
      )

      filtered[field] = smoothValue(
        previous?.[field],
        medianValue ?? measurement[field],
        config.filtering.smoothingFactor,
      )
    })

    if (requiresBaseline) {
      previous = filtered
      lossStartedAt = null
      requiresBaseline = false
      history = nextHistory

      return {
        ...filtered,
        centerMovementRatio: null,
        sizeVariationRatio: null,
        angleVariationDegrees: null,
        stability: 0,
        reacquiring: true,
        retainedDuringDetectionGrace: false,
        lostDetectionDurationMs: 0,
        lastValidDetectionAgeMs: 0,
        dataQuality: 'baseline',
      }
    }

    const centerMovementRatio = previous
      ? Math.hypot(
          filtered.centerX - previous.centerX,
          filtered.centerY - previous.centerY,
        )
      : 0
    const sizeVariationRatio = previous
      ? Math.max(
          Math.abs(
            filtered.faceWidthRatio - previous.faceWidthRatio,
          ) / Math.max(previous.faceWidthRatio, Number.EPSILON),
          Math.abs(
            filtered.faceHeightRatio - previous.faceHeightRatio,
          ) / Math.max(previous.faceHeightRatio, Number.EPSILON),
        )
      : 0
    const angleVariationDegrees = previous
      ? Math.max(
          Math.abs(filtered.roll - previous.roll),
          Math.abs(filtered.yaw - previous.yaw),
          Math.abs(filtered.pitch - previous.pitch),
        )
      : 0
    const centerScore = Math.max(
      0,
      1 -
        centerMovementRatio /
          thresholds.maxCenterMovementRatio,
    )
    const sizeScore = Math.max(
      0,
      1 -
        sizeVariationRatio /
          thresholds.maxSizeVariationRatio,
    )
    const angleScore = Math.max(
      0,
      1 -
        angleVariationDegrees /
          thresholds.maxAngleVariationDegrees,
    )

    previous = filtered
    lossStartedAt = null
    history = nextHistory

    return {
      ...filtered,
      centerMovementRatio,
      sizeVariationRatio,
      angleVariationDegrees,
      stability: Math.min(centerScore, sizeScore, angleScore),
      reacquiring: false,
      retainedDuringDetectionGrace: false,
      lostDetectionDurationMs: 0,
      lastValidDetectionAgeMs: 0,
      dataQuality: 'filtered',
    }
  }

  return {
    reset,
    update,
  }
}

export default createCameraMeasurementFilter
