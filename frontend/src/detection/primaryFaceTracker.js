import { getFaceArea, getFaceAspectRatio } from './faceSelection.js'

function getBoundingBoxIou(first, second) {
  if (!first || !second) {
    return 0
  }

  const left = Math.max(first.x, second.x)
  const top = Math.max(first.y, second.y)
  const right = Math.min(
    first.x + first.width,
    second.x + second.width,
  )
  const bottom = Math.min(
    first.y + first.height,
    second.y + second.height,
  )
  const intersection =
    Math.max(0, right - left) * Math.max(0, bottom - top)
  const union =
    first.width * first.height +
    second.width * second.height -
    intersection

  return union > 0 ? intersection / union : 0
}

function getCenterDistance(first, second) {
  return Math.hypot(
    first.centerX - second.centerX,
    first.centerY - second.centerY,
  )
}

function getRelativeChange(first, second) {
  return (
    Math.abs(first - second) /
    Math.max(Math.abs(first), Math.abs(second), Number.EPSILON)
  )
}

function getFaceCoherence(previous, current, config) {
  if (!previous || !current) {
    return {
      coherent: false,
      iou: 0,
      centerDistance: null,
      relativeAreaChange: null,
      relativeAspectChange: null,
    }
  }

  const iou = getBoundingBoxIou(
    previous.trackingBox,
    current.trackingBox,
  )
  const centerDistance = getCenterDistance(previous, current)
  const relativeAreaChange = getRelativeChange(
    getFaceArea(previous),
    getFaceArea(current),
  )
  const relativeAspectChange = getRelativeChange(
    getFaceAspectRatio(previous),
    getFaceAspectRatio(current),
  )
  const overlapsOrRemainsClose =
    iou >= config.faceTracking.minimumIou ||
    centerDistance <= config.faceTracking.strongCenterDistance

  return {
    coherent:
      overlapsOrRemainsClose &&
      centerDistance <=
        config.faceTracking.maximumCenterDistance &&
      relativeAreaChange <=
        config.faceTracking.maximumRelativeAreaChange &&
      relativeAspectChange <=
        config.faceTracking.maximumRelativeAspectChange,
    iou,
    centerDistance,
    relativeAreaChange,
    relativeAspectChange,
  }
}

function areFacePairsCoherent(previousFaces, currentFaces, config) {
  if (previousFaces.length < 2 || currentFaces.length < 2) {
    return false
  }

  return (
    (getFaceCoherence(
      previousFaces[0],
      currentFaces[0],
      config,
    ).coherent &&
      getFaceCoherence(
        previousFaces[1],
        currentFaces[1],
        config,
      ).coherent) ||
    (getFaceCoherence(
      previousFaces[0],
      currentFaces[1],
      config,
    ).coherent &&
      getFaceCoherence(
        previousFaces[1],
        currentFaces[0],
        config,
      ).coherent)
  )
}

function createPrimaryFaceTracker(config) {
  let candidateFace = null
  let candidateSampleCount = 0
  let confirmedPrimaryFace = null
  let previousRelevantFaces = []
  let multipleFaceSampleCount = 0

  const reset = () => {
    candidateFace = null
    candidateSampleCount = 0
    confirmedPrimaryFace = null
    previousRelevantFaces = []
    multipleFaceSampleCount = 0
  }

  const update = (selection) => {
    const relevantFaces = selection.faces.filter(
      ({ classification }) =>
        classification === 'primary' ||
        classification === 'relevant_secondary',
    )
    const primaryFace = selection.primaryFace

    if (!primaryFace) {
      reset()
      return {
        candidatePrimaryFace: null,
        candidateSampleCount: 0,
        confirmedPrimaryFace: null,
        confirmedFaceCount: 0,
        identityChanged: false,
        multipleFacesCoherent: false,
        multipleFaceSampleCount: 0,
      }
    }

    if (relevantFaces.length > 1) {
      const pairCoherent = areFacePairsCoherent(
        previousRelevantFaces,
        relevantFaces,
        config,
      )
      multipleFaceSampleCount = pairCoherent
        ? multipleFaceSampleCount + 1
        : 1
      candidateFace = null
      candidateSampleCount = 0
      confirmedPrimaryFace = null
      previousRelevantFaces = relevantFaces

      return {
        candidatePrimaryFace: primaryFace,
        candidateSampleCount: 0,
        confirmedPrimaryFace: null,
        confirmedFaceCount: 0,
        identityChanged: false,
        multipleFacesCoherent: pairCoherent,
        multipleFaceSampleCount,
      }
    }

    previousRelevantFaces = relevantFaces
    multipleFaceSampleCount = 0

    if (confirmedPrimaryFace) {
      const coherence = getFaceCoherence(
        confirmedPrimaryFace,
        primaryFace,
        config,
      )

      if (coherence.coherent) {
        confirmedPrimaryFace = primaryFace
        candidateFace = primaryFace
        candidateSampleCount += 1
        return {
          candidatePrimaryFace: candidateFace,
          candidateSampleCount,
          confirmedPrimaryFace,
          confirmedFaceCount: 1,
          identityChanged: false,
          multipleFacesCoherent: false,
          multipleFaceSampleCount: 0,
          coherence,
        }
      }

      confirmedPrimaryFace = null
      candidateFace = primaryFace
      candidateSampleCount = 1
      return {
        candidatePrimaryFace: candidateFace,
        candidateSampleCount,
        confirmedPrimaryFace: null,
        confirmedFaceCount: 0,
        identityChanged: true,
        multipleFacesCoherent: false,
        multipleFaceSampleCount: 0,
        coherence,
      }
    }

    const coherence = getFaceCoherence(
      candidateFace,
      primaryFace,
      config,
    )
    candidateSampleCount = coherence.coherent
      ? candidateSampleCount + 1
      : 1
    candidateFace = primaryFace

    if (
      candidateSampleCount >=
      config.faceTracking.confirmationSamples
    ) {
      confirmedPrimaryFace = primaryFace
    }

    return {
      candidatePrimaryFace: candidateFace,
      candidateSampleCount,
      confirmedPrimaryFace,
      confirmedFaceCount: confirmedPrimaryFace ? 1 : 0,
      identityChanged: false,
      multipleFacesCoherent: false,
      multipleFaceSampleCount: 0,
      coherence,
    }
  }

  return { reset, update }
}

export {
  areFacePairsCoherent,
  createPrimaryFaceTracker,
  getBoundingBoxIou,
  getCenterDistance,
  getFaceCoherence,
  getRelativeChange,
}
