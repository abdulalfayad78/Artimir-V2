import assert from 'node:assert/strict'
import test from 'node:test'

import heightObservationConfig from '../frontend/src/config/heightObservationConfig.js'
import {
  calculateEyeCenter,
  contourEyeLandmarkIndices,
  irisEyeLandmarkIndices,
} from '../frontend/src/detection/heightEyeLandmarks.js'
import {
  createHeightObservationAnalyzer,
  heightRecommendations,
  imageVerticalObservations,
} from '../frontend/src/detection/heightObservation.js'

const testConfig = Object.freeze({
  ...heightObservationConfig,
  minimumStableDurationMs: 600,
  minimumStableSamples: 8,
  recommendationConfirmationMs: 400,
  minimumRecommendationDisplayMs: 500,
})

function makeGlobalState({
  blockingReason = null,
  eyeCenterY = 0.5,
  eyeLandmarksAvailable = true,
  relevantFaceCount = 1,
  timestamp = 0,
  cameraOverrides = {},
} = {}) {
  const faceDetected = relevantFaceCount > 0

  return {
    primaryCameraId: 'top',
    rawBlockingState: blockingReason,
    timestamp,
    cameras: {
      top: {
        available: true,
        blockingReason,
        confirmedPrimaryFace: faceDetected ? { id: 'face' } : null,
        dataAgeMs: 0,
        eyeCenterMethod: eyeLandmarksAvailable
          ? 'eye_contour'
          : null,
        eyeCenterY: eyeLandmarksAvailable ? eyeCenterY : null,
        eyeLandmarksAvailable,
        faceWidthRatio: 0.22,
        faceDetected,
        angleVariationDegrees: 0.2,
        centerMovementRatio: 0.002,
        primaryIdentityChanged: false,
        pitch: 0,
        reacquiring: false,
        relevantFaceCount,
        roll: 0,
        sizeVariationRatio: 0.002,
        timestamp,
        totalFaceCount: relevantFaceCount,
        usableForMapping: !blockingReason && faceDetected,
        yaw: 0,
        ...cameraOverrides,
      },
    },
  }
}

function feedStable(analyzer, eyeCenterY, options = {}) {
  let state = analyzer.getState()

  for (let index = 0; index < 13; index += 1) {
    const now = index * 100
    state = analyzer.update(
      makeGlobalState({
        eyeCenterY,
        timestamp: now,
        ...options,
      }),
      now,
    )
  }

  return state
}

test('height observation uses iris landmarks when all iris points are available', () => {
  const landmarks = []

  for (const index of [
    ...irisEyeLandmarkIndices.leftEye,
    ...irisEyeLandmarkIndices.rightEye,
  ]) {
    landmarks[index] = { x: 0.5, y: 0.42, z: 0 }
  }

  const eyeCenter = calculateEyeCenter(landmarks)

  assert.equal(eyeCenter.method, 'iris')
  assert.ok(Math.abs(eyeCenter.y - 0.42) < 0.000001)
})

test('height observation falls back to multiple eye contour landmarks', () => {
  const landmarks = []

  for (const index of [
    ...contourEyeLandmarkIndices.leftEye,
    ...contourEyeLandmarkIndices.rightEye,
  ]) {
    landmarks[index] = { x: 0.5, y: 0.48, z: 0 }
  }

  const eyeCenter = calculateEyeCenter(landmarks)

  assert.equal(eyeCenter.method, 'eye_contour')
  assert.ok(Math.abs(eyeCenter.y - 0.48) < 0.000001)
})

test('height observation rejects unavailable eye landmarks', () => {
  const analyzer = createHeightObservationAnalyzer({
    config: testConfig,
  })
  const state = feedStable(analyzer, 0.5, {
    eyeLandmarksAvailable: false,
  })

  assert.equal(
    state.rawHeightRecommendation,
    heightRecommendations.reacquiring,
  )
  assert.equal(state.reason, 'eye_landmarks_unavailable')
})

test('eyes on target and inside tolerance become height_correct only after stability and display confirmation', () => {
  const analyzer = createHeightObservationAnalyzer({
    config: testConfig,
  })
  const state = feedStable(analyzer, 0.5)

  assert.equal(
    state.rawHeightRecommendation,
    heightRecommendations.heightCorrect,
  )
  assert.equal(
    state.displayedHeightRecommendation,
    heightRecommendations.heightCorrect,
  )

  const toleranceAnalyzer = createHeightObservationAnalyzer({
    config: testConfig,
  })
  const toleranceState = feedStable(toleranceAnalyzer, 0.524)

  assert.equal(
    toleranceState.rawHeightRecommendation,
    heightRecommendations.heightCorrect,
  )
})

test('normalized Y sign is explicit for normal camera direction', () => {
  const highAnalyzer = createHeightObservationAnalyzer({
    config: testConfig,
  })
  const highState = feedStable(highAnalyzer, 0.44)

  assert.equal(highState.verticalError < 0, true)
  assert.equal(
    highState.imageObservation,
    imageVerticalObservations.eyesTooHigh,
  )
  assert.equal(
    highState.rawHeightRecommendation,
    heightRecommendations.artimirShouldMoveUp,
  )

  const lowAnalyzer = createHeightObservationAnalyzer({
    config: testConfig,
  })
  const lowState = feedStable(lowAnalyzer, 0.56)

  assert.equal(lowState.verticalError > 0, true)
  assert.equal(
    lowState.imageObservation,
    imageVerticalObservations.eyesTooLow,
  )
  assert.equal(
    lowState.rawHeightRecommendation,
    heightRecommendations.artimirShouldMoveDown,
  )
})

test('inverted camera direction only flips physical recommendation', () => {
  const analyzer = createHeightObservationAnalyzer({
    config: {
      ...testConfig,
      cameraVerticalDirection: 'inverted',
    },
  })
  const state = feedStable(analyzer, 0.44)

  assert.equal(
    state.imageObservation,
    imageVerticalObservations.eyesTooHigh,
  )
  assert.equal(
    state.rawHeightRecommendation,
    heightRecommendations.artimirShouldMoveDown,
  )
})

test('hysteresis prevents flicker around the correct height boundary', () => {
  const analyzer = createHeightObservationAnalyzer({
    config: testConfig,
  })
  const correctState = feedStable(analyzer, 0.5)

  assert.equal(
    correctState.rawHeightRecommendation,
    heightRecommendations.heightCorrect,
  )

  const withinHysteresis = analyzer.update(
    makeGlobalState({ eyeCenterY: 0.531, timestamp: 1300 }),
    1300,
  )

  assert.equal(
    withinHysteresis.rawHeightRecommendation,
    heightRecommendations.heightCorrect,
  )
})

test('bad or unstable frames invalidate the raw recommendation immediately without forcing an instant visible flash', () => {
  const analyzer = createHeightObservationAnalyzer({
    config: testConfig,
  })
  feedStable(analyzer, 0.5)

  const badFrame = analyzer.update(
    makeGlobalState({
      cameraOverrides: {
        centerMovementRatio: 0.2,
      },
      eyeCenterY: 0.5,
      timestamp: 1300,
    }),
    1300,
  )

  assert.equal(
    badFrame.rawHeightRecommendation,
    heightRecommendations.faceUnstable,
  )
  assert.equal(badFrame.stableSampleCount, 0)
  assert.equal(
    badFrame.displayedHeightRecommendation,
    heightRecommendations.heightCorrect,
  )
})

test('height observation does not require full positioning correctness', () => {
  const analyzer = createHeightObservationAnalyzer({
    config: testConfig,
  })
  const state = feedStable(analyzer, 0.56, {
    blockingReason: 'move_left',
  })

  assert.equal(state.faceValid, true)
  assert.equal(state.diagnostics.rawBlockingState, 'move_left')
  assert.equal(
    state.rawHeightRecommendation,
    heightRecommendations.artimirShouldMoveDown,
  )
})

test('height observation reports the precise blocking condition for diagnostics', () => {
  const analyzer = createHeightObservationAnalyzer({
    config: testConfig,
  })
  const state = feedStable(analyzer, 0.5, {
    eyeLandmarksAvailable: false,
  })

  assert.equal(state.diagnostics.faceDetected, true)
  assert.equal(state.diagnostics.primaryFaceConfirmed, true)
  assert.equal(state.diagnostics.insideRoi, true)
  assert.equal(state.diagnostics.eyesAvailable, false)
  assert.equal(state.reason, 'eye_landmarks_unavailable')
})

test('persistent absence is displayed only after confirmation', () => {
  const analyzer = createHeightObservationAnalyzer({
    config: testConfig,
  })
  feedStable(analyzer, 0.5)

  let state = analyzer.update(
    makeGlobalState({ relevantFaceCount: 0, timestamp: 1300 }),
    1300,
  )
  assert.equal(
    state.displayedHeightRecommendation,
    heightRecommendations.heightCorrect,
  )

  state = analyzer.update(
    makeGlobalState({ relevantFaceCount: 0, timestamp: 1800 }),
    1800,
  )
  assert.equal(
    state.displayedHeightRecommendation,
    heightRecommendations.faceNotDetected,
  )
})

test('stale data and camera unavailable do not produce height_correct', () => {
  const analyzer = createHeightObservationAnalyzer({
    config: testConfig,
  })
  const state = analyzer.update(
    makeGlobalState({ eyeCenterY: 0.5, timestamp: 0 }),
    1000,
  )

  assert.notEqual(
    state.rawHeightRecommendation,
    heightRecommendations.heightCorrect,
  )
})

test('stable observation never calls motor commands or motor endpoints', () => {
  const calls = []
  const originalFetch = globalThis.fetch
  globalThis.fetch = async (url) => {
    calls.push(String(url))
    throw new Error('unexpected fetch')
  }

  try {
    const controller = {
      homeCalls: 0,
      moveCalls: 0,
      home() {
        this.homeCalls += 1
      },
      moveToMm() {
        this.moveCalls += 1
      },
    }
    const analyzer = createHeightObservationAnalyzer({
      config: testConfig,
    })

    feedStable(analyzer, 0.56)
    feedStable(analyzer, 0.5)

    assert.equal(controller.homeCalls, 0)
    assert.equal(controller.moveCalls, 0)
    assert.equal(
      calls.some(
        (url) =>
          url.endsWith('/motor/home') ||
          url.endsWith('/motor/move-to'),
      ),
      false,
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})
