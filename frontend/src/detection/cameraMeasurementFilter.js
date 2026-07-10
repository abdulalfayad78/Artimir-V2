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

function createCameraMeasurementFilter(config) {
  let previous = null
  let lossStartedAt = null
  let requiresBaseline = true

  const reset = () => {
    previous = null
    lossStartedAt = null
    requiresBaseline = true
  }

  const update = (measurement, thresholds) => {
    if (
      !measurement.faceDetected ||
      measurement.faceCount !== 1 ||
      !measurement.essentialLandmarksPresent
    ) {
      lossStartedAt ??= measurement.timestamp

      if (
        measurement.timestamp - lossStartedAt >=
        config.analysis.noFaceRetentionMs
      ) {
        previous = null
      }

      requiresBaseline = true
      return {
        ...measurement,
        centerMovementRatio: null,
        sizeVariationRatio: null,
        angleVariationDegrees: null,
        stability: 0,
        reacquiring: true,
      }
    }

    const filtered = { ...measurement }

    filteredFields.forEach((field) => {
      filtered[field] = smoothValue(
        previous?.[field],
        measurement[field],
        config.filtering.smoothingFactor,
      )
    })

    if (requiresBaseline) {
      previous = filtered
      lossStartedAt = null
      requiresBaseline = false

      return {
        ...filtered,
        centerMovementRatio: null,
        sizeVariationRatio: null,
        angleVariationDegrees: null,
        stability: 0,
        reacquiring: true,
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

    return {
      ...filtered,
      centerMovementRatio,
      sizeVariationRatio,
      angleVariationDegrees,
      stability: Math.min(centerScore, sizeScore, angleScore),
      reacquiring: false,
    }
  }

  return {
    reset,
    update,
  }
}

export default createCameraMeasurementFilter
