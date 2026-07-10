import assert from 'node:assert/strict'
import test from 'node:test'
import positioningConfig from '../frontend/src/config/positioningConfig.js'
import { createCameraResult } from '../frontend/src/detection/cameraResult.js'
import {
  createMultiCameraAggregator,
  getGlobalPositionCriteria,
  positioningInstructions,
} from '../frontend/src/detection/multiCameraAggregator.js'
import { getBoundingBoxIou } from '../frontend/src/detection/primaryFaceTracker.js'

function face({
  centerX = 0.5,
  centerY = 0.5,
  width = 0.22,
  height = 0.4,
} = {}) {
  return {
    confidence: 0.96,
    confidenceAvailable: true,
    confidenceSource: 'test_score',
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
    trackingBox: {
      x: centerX - width / 2,
      y: centerY - height / 2,
      width,
      height,
      centerX,
      centerY,
    },
  }
}

function result(timestamp, faces) {
  return createCameraResult('top', {
    available: true,
    faceDetected: faces.length > 0,
    faceCount: faces.length,
    totalFaceCount: faces.length,
    faces,
    timestamp,
  })
}

function run(
  aggregator,
  faces,
  start = 1000,
  end = 2000,
) {
  let state

  for (let timestamp = start; timestamp <= end; timestamp += 50) {
    state = aggregator.update(result(timestamp, faces))
  }

  return state
}

function createStableGuidance() {
  const aggregator = createMultiCameraAggregator()
  const guidanceFace = face({ centerX: 0.4 })
  const state = run(aggregator, [guidanceFace])

  assert.equal(
    state.displayedInstruction,
    positioningInstructions.moveLeft,
  )
  return { aggregator, guidanceFace, state }
}

test('one face_not_detected frame blocks internally without a visible flash', () => {
  const { aggregator, state } = createStableGuidance()
  const lost = aggregator.update(result(2050, []))

  assert.equal(
    lost.rawBlockingState,
    positioningInstructions.faceNotDetected,
  )
  assert.equal(lost.stableProgress, 0)
  assert.equal(lost.positionCorrect, false)
  assert.equal(
    lost.displayedInstruction,
    state.displayedInstruction,
  )
})

test('persistent face absence is displayed after 200 ms', () => {
  const { aggregator } = createStableGuidance()
  let state

  for (let timestamp = 2050; timestamp <= 2300; timestamp += 50) {
    state = aggregator.update(result(timestamp, []))
  }

  assert.equal(
    state.displayedInstruction,
    positioningInstructions.faceNotDetected,
  )
})

test('one multiple_faces frame blocks without displaying multiple_faces', () => {
  const { aggregator, guidanceFace, state } =
    createStableGuidance()
  const blocked = aggregator.update(
    result(2050, [
      guidanceFace,
      face({ centerX: 0.65, width: 0.2, height: 0.36 }),
    ]),
  )

  assert.equal(
    blocked.rawBlockingState,
    positioningInstructions.multipleFaces,
  )
  assert.equal(blocked.stableProgress, 0)
  assert.equal(
    blocked.displayedInstruction,
    state.displayedInstruction,
  )
})

test('two coherent faces persisting for more than 200 ms are displayed', () => {
  const { aggregator, guidanceFace } = createStableGuidance()
  const twoFaces = [
    guidanceFace,
    face({ centerX: 0.65, width: 0.2, height: 0.36 }),
  ]
  let state

  for (let timestamp = 2050; timestamp <= 2350; timestamp += 50) {
    state = aggregator.update(result(timestamp, twoFaces))
  }

  assert.equal(state.cameras.top.multipleFacesCoherent, true)
  assert.equal(
    state.displayedInstruction,
    positioningInstructions.multipleFaces,
  )
})

test('a one-frame false face never becomes the confirmed primary face', () => {
  const aggregator = createMultiCameraAggregator()
  const state = aggregator.update(result(1000, [face()]))

  assert.equal(state.cameras.top.confirmedPrimaryFace, null)
  assert.equal(state.cameras.top.confirmedFaceCount, 0)
})

test('the same coherent face is confirmed after two analyses', () => {
  const aggregator = createMultiCameraAggregator()
  aggregator.update(result(1000, [face()]))
  const state = aggregator.update(result(1050, [face()]))

  assert.ok(state.cameras.top.confirmedPrimaryFace)
  assert.equal(state.cameras.top.confirmedFaceCount, 1)
})

test('an abrupt center change returns to reacquiring', () => {
  const aggregator = createMultiCameraAggregator()
  run(aggregator, [face()])
  const state = aggregator.update(
    result(2050, [face({ centerX: 0.72 })]),
  )

  assert.equal(
    state.rawInstruction,
    positioningInstructions.reacquiring,
  )
  assert.equal(state.cameras.top.confirmedPrimaryFace, null)
})

test('an abrupt size change returns to reacquiring', () => {
  const aggregator = createMultiCameraAggregator()
  run(aggregator, [face()])
  const state = aggregator.update(
    result(2050, [face({ width: 0.45, height: 0.75 })]),
  )

  assert.equal(
    state.rawInstruction,
    positioningInstructions.reacquiring,
  )
  assert.equal(state.cameras.top.confirmedPrimaryFace, null)
})

test('an excessively flat bounding box is rejected', () => {
  const aggregator = createMultiCameraAggregator()
  const state = aggregator.update(
    result(1000, [face({ width: 0.22, height: 0.1 })]),
  )

  assert.equal(state.cameras.top.rejectedFaceCount, 1)
  assert.equal(
    state.rawInstruction,
    positioningInstructions.invalidData,
  )
})

test('a displayed instruction is retained for at least 500 ms', () => {
  const { aggregator } = createStableGuidance()
  let state

  for (let timestamp = 2050; timestamp < 2650; timestamp += 50) {
    state = aggregator.update(
      result(timestamp, [face({ centerX: 0.6 })]),
    )
  }

  assert.notEqual(
    state.displayedInstruction,
    positioningInstructions.moveRight,
  )
  state = aggregator.update(
    result(2650, [face({ centerX: 0.6 })]),
  )
  assert.equal(
    state.displayedInstruction,
    positioningInstructions.moveRight,
  )
})

test('visible criteria remain coherent with the displayed instruction', () => {
  const { aggregator } = createStableGuidance()
  const blocked = aggregator.update(result(2050, []))
  const criteria = getGlobalPositionCriteria(blocked)

  assert.equal(
    blocked.displayedInstruction,
    positioningInstructions.moveLeft,
  )
  assert.equal(criteria.find(({ id }) => id === 'face').state, 'valid')
  assert.equal(
    criteria.find(({ id }) => id === 'distance').state,
    'valid',
  )
  assert.equal(
    criteria.find(({ id }) => id === 'center').state,
    'current',
  )
})

test('raw blocking always disables progress and positionCorrect', () => {
  const aggregator = createMultiCameraAggregator()
  const progressing = run(aggregator, [face()], 1000, 2300)

  assert.ok(progressing.stableProgress > 0)
  const blocked = aggregator.update(result(2350, []))
  assert.ok(blocked.rawBlockingState)
  assert.equal(blocked.stableProgress, 0)
  assert.equal(blocked.positionCorrect, false)
})

test('rapid no-face/one-face alternation does not cycle visible instructions', () => {
  const { aggregator, guidanceFace } = createStableGuidance()
  const displayed = []

  for (let index = 0; index < 12; index += 1) {
    const state = aggregator.update(
      result(
        2050 + index * 50,
        index % 2 ? [guidanceFace] : [],
      ),
    )
    displayed.push(state.displayedInstruction)
  }

  assert.equal(
    displayed.includes(positioningInstructions.faceNotDetected),
    false,
  )
  assert.ok(new Set(displayed).size <= 2)
})

test('rapid one-face/multiple-faces alternation never displays multiple_faces', () => {
  const { aggregator, guidanceFace } = createStableGuidance()
  const secondFace = face({
    centerX: 0.65,
    width: 0.2,
    height: 0.36,
  })
  const displayed = []

  for (let index = 0; index < 12; index += 1) {
    const faces =
      index % 2 ? [guidanceFace] : [guidanceFace, secondFace]
    displayed.push(
      aggregator.update(result(2050 + index * 50, faces))
        .displayedInstruction,
    )
  }

  assert.equal(
    displayed.includes(positioningInstructions.multipleFaces),
    false,
  )
})

test('IoU uses intersection area divided by union area', () => {
  const first = {
    x: 0,
    y: 0,
    width: 0.2,
    height: 0.2,
  }
  const second = {
    x: 0.1,
    y: 0,
    width: 0.2,
    height: 0.2,
  }

  assert.ok(
    Math.abs(getBoundingBoxIou(first, second) - 1 / 3) <
      Number.EPSILON,
  )
})

test('an absent confidence remains unavailable instead of becoming perfect', () => {
  const aggregator = createMultiCameraAggregator()
  const internallyAcceptedFace = {
    ...face(),
    confidence: null,
    confidenceAvailable: false,
    confidenceSource: 'mediapipe_internal_thresholds',
    passedInternalConfidenceThresholds: true,
  }
  aggregator.update(result(1000, [internallyAcceptedFace]))
  const state = aggregator.update(
    result(1050, [internallyAcceptedFace]),
  )

  assert.equal(state.cameras.top.confidence, null)
  assert.equal(state.cameras.top.confidenceAvailable, false)
  assert.equal(
    state.cameras.top.confidenceSource,
    'mediapipe_internal_thresholds',
  )
})

test('one stale evaluation blocks progress without flashing before recovery', () => {
  const { aggregator, guidanceFace, state } =
    createStableGuidance()
  const stale = aggregator.getState(
    2000 + positioningConfig.analysis.maxDataAgeMs,
  )

  assert.equal(
    stale.rawBlockingState,
    positioningInstructions.dataStale,
  )
  assert.equal(stale.stableProgress, 0)
  assert.notEqual(
    stale.displayedInstruction,
    positioningInstructions.dataStale,
  )

  const recovered = aggregator.update(
    result(2220, [guidanceFace]),
  )
  assert.notEqual(
    recovered.displayedInstruction,
    positioningInstructions.dataStale,
  )
  assert.equal(state.positionCorrect, false)
})
