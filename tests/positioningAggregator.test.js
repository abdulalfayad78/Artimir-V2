import assert from 'node:assert/strict'
import test from 'node:test'
import positioningConfig from '../frontend/src/config/positioningConfig.js'
import {
  createDiagnosticDemoState,
  createMultiCameraAggregator,
  positioningInstructions,
} from '../frontend/src/detection/multiCameraAggregator.js'
import {
  createCameraResult,
  mirrorTrackingBoxForPreview,
} from '../frontend/src/detection/cameraResult.js'
import adaptMappingCameraResult from '../frontend/src/detection/mappingPositioningAdapter.js'

function validCameraResult(
  cameraId,
  timestamp,
  overrides = {},
) {
  const centerX =
    overrides.centerX ?? overrides.trackingBox?.centerX ?? 0.5
  const centerY =
    overrides.centerY ?? overrides.trackingBox?.centerY ?? 0.5
  const width = overrides.faceWidthRatio ?? 0.22
  const height =
    overrides.faceHeightRatio ??
    (overrides.faceWidthRatio ? width / 0.55 : 0.4)
  const faceCount = overrides.faceCount ?? 1
  const trackingBox = overrides.trackingBox ?? {
    x: centerX - width / 2,
    y: centerY - height / 2,
    width,
    height,
    centerX,
    centerY,
  }
  const primaryFace = {
    confidence: overrides.confidence ?? 0.96,
    centerX,
    centerY,
    faceWidthRatio: width,
    faceHeightRatio: height,
    roll: overrides.roll ?? 0,
    yaw: overrides.yaw ?? 0,
    pitch: overrides.pitch ?? 0,
    landmarksAvailable: overrides.landmarksAvailable ?? true,
    essentialLandmarksPresent:
      overrides.essentialLandmarksPresent ?? true,
    overlapRegions: overrides.overlapRegions ?? {
      nose: true,
      eyes: true,
      mouth: true,
      cheeks: true,
    },
    trackingBox,
  }
  const faces =
    overrides.faces ??
    (faceCount === 0
      ? []
      : [
          primaryFace,
          ...(faceCount > 1
            ? [
                {
                  ...primaryFace,
                  centerX: 0.62,
                  trackingBox: {
                    ...trackingBox,
                    x: 0.62 - width / 2,
                    centerX: 0.62,
                  },
                },
              ]
            : []),
        ])

  return createCameraResult(cameraId, {
    available: true,
    faceCount,
    totalFaceCount: faceCount,
    faceDetected: faceCount > 0,
    confidence: 0.96,
    centerX,
    centerY,
    faceWidthRatio: width,
    faceHeightRatio: height,
    roll: 0,
    yaw: 0,
    pitch: 0,
    landmarksAvailable: true,
    essentialLandmarksPresent: true,
    overlapRegions: {
      nose: true,
      eyes: true,
      mouth: true,
      cheeks: true,
    },
    trackingBox,
    faces,
    timestamp,
    ...overrides,
  })
}

function instructionFor(overrides) {
  const aggregator = createMultiCameraAggregator()
  let state

  for (let timestamp = 1000; timestamp <= 1800; timestamp += 50) {
    state = aggregator.update(
      validCameraResult('top', timestamp, overrides),
    )
  }

  return state.primaryInstruction
}

test('single-camera guidance covers presence, count, distance and frame', () => {
  const unavailable = createMultiCameraAggregator().getState(1000)
  assert.equal(
    unavailable.primaryInstruction,
    positioningInstructions.primaryUnavailable,
  )
  assert.equal(
    instructionFor({ faceCount: 0, faceDetected: false }),
    positioningInstructions.faceNotDetected,
  )
  assert.equal(
    instructionFor({ faceCount: 2 }),
    positioningInstructions.multipleFaces,
  )
  assert.equal(
    instructionFor({ faceWidthRatio: 0.12 }),
    positioningInstructions.tooFar,
  )
  assert.equal(
    instructionFor({ faceWidthRatio: 0.5 }),
    positioningInstructions.tooClose,
  )
  assert.equal(
    instructionFor({
      trackingBox: {
        x: 0,
        y: 0.3,
        width: 0.22,
        height: 0.4,
        centerX: 0.17,
        centerY: 0.5,
      },
    }),
    positioningInstructions.moveLeft,
  )
})

test('bounding-box fallback cannot complete landmark validation', () => {
  const aggregator = createMultiCameraAggregator()
  const state = aggregator.update(
    validCameraResult('top', 1000, {
      landmarksAvailable: false,
      essentialLandmarksPresent: false,
    }),
  )

  assert.equal(state.cameras.top.usableForMapping, false)
  assert.equal(state.positionCorrect, false)
})

test('raw coordinates give correct left/right instructions with mirrored preview', () => {
  const leftAggregator = createMultiCameraAggregator()
  const rawLeft = validCameraResult('top', 1000, {
    centerX: 0.4,
  })
  leftAggregator.update(rawLeft)
  const trackedLeftState = leftAggregator.update(
    validCameraResult('top', 1050, {
      centerX: 0.4,
    }),
  )
  const mirroredBox = mirrorTrackingBoxForPreview(
    trackedLeftState.cameras.top.trackingBox,
  )

  assert.equal(
    instructionFor({ centerX: 0.4 }),
    positioningInstructions.moveLeft,
  )
  assert.ok(mirroredBox.centerX > 0.5)

  assert.equal(
    instructionFor({ centerX: 0.6 }),
    positioningInstructions.moveRight,
  )
})

test('vertical center is used independently from horizontal center', () => {
  assert.equal(
    instructionFor({ centerX: 0.5, centerY: 0.4 }),
    positioningInstructions.moveDown,
  )
  assert.equal(
    instructionFor({ centerX: 0.5, centerY: 0.6 }),
    positioningInstructions.moveUp,
  )
})

test('positive and negative pose angles produce coherent guidance', () => {
  assert.equal(
    instructionFor({ roll: 9 }),
    positioningInstructions.straightenHead,
  )
  assert.equal(
    instructionFor({ roll: -9 }),
    positioningInstructions.straightenHead,
  )
  assert.equal(
    instructionFor({ yaw: 12 }),
    positioningInstructions.lookForward,
  )
  assert.equal(
    instructionFor({ yaw: -12 }),
    positioningInstructions.lookForward,
  )
  assert.equal(
    instructionFor({ pitch: 12 }),
    positioningInstructions.raiseHead,
  )
  assert.equal(
    instructionFor({ pitch: -12 }),
    positioningInstructions.lowerHead,
  )
})

test('stale data and a real face loss reset progress', () => {
  const aggregator = createMultiCameraAggregator()

  for (let timestamp = 1000; timestamp <= 2100; timestamp += 50) {
    aggregator.update(validCameraResult('top', timestamp))
  }

  assert.ok(aggregator.getState(2100).stableProgress > 0)
  const staleState = aggregator.getState(
    2100 + positioningConfig.analysis.maxDataAgeMs + 1,
  )
  assert.equal(
    staleState.rawInstruction,
    positioningInstructions.dataStale,
  )
  assert.equal(staleState.stableProgress, 0)

  const lostState = aggregator.update(
    validCameraResult('top', 2600, {
      faceCount: 0,
      faceDetected: false,
    }),
  )
  assert.equal(lostState.stableProgress, 0)
})

test('validation requires the configured stable duration and enough measurements', () => {
  const aggregator = createMultiCameraAggregator()
  let state

  for (let timestamp = 1000; timestamp < 2800; timestamp += 50) {
    state = aggregator.update(validCameraResult('top', timestamp))
  }

  assert.equal(state.positionCorrect, false)
  assert.ok(state.stableProgress < 1)

  state = aggregator.update(validCameraResult('top', 2800))
  assert.equal(state.positionCorrect, true)
  assert.ok(
    state.validMeasurementCount >=
      positioningConfig.filtering.minimumValidMeasurements,
  )
})

test('small movement is smoothed while large movement resets progress', () => {
  const aggregator = createMultiCameraAggregator()

  for (let timestamp = 1000; timestamp <= 1800; timestamp += 50) {
    aggregator.update(validCameraResult('top', timestamp))
  }

  const before = aggregator.getState(1800).stableProgress
  const smallMovement = aggregator.update(
    validCameraResult('top', 1850, { centerX: 0.51 }),
  )

  assert.ok(smallMovement.stableProgress >= before)

  const largeMovement = aggregator.update(
    validCameraResult('top', 1900, { centerX: 0.72 }),
  )
  assert.equal(largeMovement.stableProgress, 0)
  assert.notEqual(
    largeMovement.primaryInstruction,
    positioningInstructions.holdStill,
  )
})

test('pose hysteresis prevents instruction flicker near a limit', () => {
  const aggregator = createMultiCameraAggregator()
  let timestamp = 1000
  let state

  for (let index = 0; index < 18; index += 1) {
    state = aggregator.update(
      validCameraResult('top', timestamp, { roll: 12 }),
    )
    timestamp += 50
  }

  assert.equal(
    state.primaryInstruction,
    positioningInstructions.straightenHead,
  )

  for (let index = 0; index < 18; index += 1) {
    state = aggregator.update(
      validCameraResult('top', timestamp, { roll: 6 }),
    )
    timestamp += 50
  }

  assert.equal(
    state.primaryInstruction,
    positioningInstructions.straightenHead,
  )

  for (let index = 0; index < 18; index += 1) {
    state = aggregator.update(
      validCameraResult('top', timestamp, { roll: 0 }),
    )
    timestamp += 50
  }

  assert.equal(
    state.primaryInstruction,
    positioningInstructions.holdStill,
  )
})

test('top-camera distance calibration accepts the 0.16 to 0.28 range inclusively', () => {
  const scenarios = [
    [0.12, positioningInstructions.tooFar],
    [0.16, positioningInstructions.holdStill],
    [0.22, positioningInstructions.holdStill],
    [0.28, positioningInstructions.holdStill],
    [0.32, positioningInstructions.tooClose],
  ]

  for (const [faceWidthRatio, expectedInstruction] of scenarios) {
    assert.equal(
      instructionFor({ faceWidthRatio }),
      expectedInstruction,
      `unexpected instruction for faceWidthRatio=${faceWidthRatio}`,
    )
  }
})

test('top-camera distance hysteresis prevents flicker around both limits', () => {
  const farAggregator = createMultiCameraAggregator()
  const closeAggregator = createMultiCameraAggregator()
  const farInstructions = []
  const closeInstructions = []

  for (let timestamp = 1000; timestamp <= 1600; timestamp += 50) {
    farAggregator.update(
      validCameraResult('top', timestamp, {
        faceWidthRatio: 0.12,
      }),
    )
    closeAggregator.update(
      validCameraResult('top', timestamp, {
        faceWidthRatio: 0.32,
      }),
    )
  }

  for (let index = 0; index < 20; index += 1) {
    const timestamp = 1650 + index * 50
    farInstructions.push(
      farAggregator.update(
        validCameraResult('top', timestamp, {
          faceWidthRatio: index % 2 ? 0.158 : 0.162,
        }),
      ).primaryInstruction,
    )
    closeInstructions.push(
      closeAggregator.update(
        validCameraResult('top', timestamp, {
          faceWidthRatio: index % 2 ? 0.278 : 0.282,
        }),
      ).primaryInstruction,
    )
  }

  assert.deepEqual(
    new Set(farInstructions),
    new Set([positioningInstructions.tooFar]),
  )
  assert.deepEqual(
    new Set(closeInstructions),
    new Set([positioningInstructions.tooClose]),
  )
})

test('diagnostic demo can never produce final validation', () => {
  const aggregator = createMultiCameraAggregator()
  const demoState = createDiagnosticDemoState(
    aggregator.getState(1000),
    positioningInstructions.positionCorrect,
  )

  assert.equal(
    demoState.primaryInstruction,
    positioningInstructions.positionCorrect,
  )
  assert.equal(demoState.positionCorrect, false)
  assert.equal(demoState.stableProgress, 0)
})

test('future mapping adapter rejects images, video and landmarks', () => {
  for (const forbiddenPayload of [
    { image: 'data' },
    { video: 'data' },
    { landmarks: [] },
  ]) {
    assert.throws(
      () =>
        adaptMappingCameraResult({
          cameraId: 'top',
          ...forbiddenPayload,
        }),
      /Invalid mapping positioning payload/,
    )
  }
})

test('multi mode requires every camera and resets when one view is lost', () => {
  const multiConfig = {
    ...positioningConfig,
    cameraMode: 'multi',
  }
  const aggregator = createMultiCameraAggregator(multiConfig)
  let state = aggregator.update(validCameraResult('top', 1000))

  assert.equal(state.allRequiredCamerasReady, false)
  assert.equal(
    state.rawInstruction,
    positioningInstructions.reacquiring,
  )

  for (const cameraId of ['bottom', 'left', 'right']) {
    state = aggregator.update(
      validCameraResult(cameraId, 1000),
    )
  }

  for (const cameraId of ['top', 'bottom', 'left', 'right']) {
    state = aggregator.update(
      validCameraResult(cameraId, 1050),
    )
  }

  for (const cameraId of ['top', 'bottom', 'left', 'right']) {
    state = aggregator.update(
      validCameraResult(cameraId, 1100),
    )
  }

  assert.equal(state.allRequiredCamerasReady, true)

  for (let timestamp = 1150; timestamp <= 4650; timestamp += 50) {
    for (const cameraId of ['top', 'bottom', 'left', 'right']) {
      state = aggregator.update(
        validCameraResult(cameraId, timestamp),
      )
    }
  }

  assert.equal(state.positionCorrect, true)

  state = aggregator.update(
      validCameraResult('left', 4700, {
      faceCount: 0,
      faceDetected: false,
    }),
  )
  assert.equal(state.positionCorrect, false)
  assert.equal(state.stableProgress, 0)

  state = aggregator.update(validCameraResult('left', 4750))
  assert.equal(state.positionCorrect, false)
  assert.ok(state.stableProgress < 0.1)
})

test('an old secondary camera blocks multi validation', () => {
  const multiConfig = {
    ...positioningConfig,
    cameraMode: 'multi',
  }
  const aggregator = createMultiCameraAggregator(multiConfig)

  for (const timestamp of [1000, 1050, 1100]) {
    for (const cameraId of ['top', 'bottom', 'left', 'right']) {
      aggregator.update(validCameraResult(cameraId, timestamp))
    }
  }

  const now =
    1100 + positioningConfig.analysis.maxDataAgeMs + 1
  const state = aggregator.update(
    validCameraResult('top', now),
    now,
  )

  assert.equal(state.allRequiredCamerasReady, false)
  assert.equal(
    state.rawInstruction,
    positioningInstructions.secondaryBlocked,
  )
  assert.equal(state.stableProgress, 0)
})
