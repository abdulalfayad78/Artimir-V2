import assert from 'node:assert/strict'
import test from 'node:test'
import positioningConfig from '../frontend/src/config/positioningConfig.js'
import { createCameraResult } from '../frontend/src/detection/cameraResult.js'
import {
  createMultiCameraAggregator,
  getGlobalPositionCriteria,
  positioningInstructions,
} from '../frontend/src/detection/multiCameraAggregator.js'

function createFace({
  centerX = 0.5,
  centerY = 0.5,
  width = 0.22,
  height = 0.4,
  roll = 0,
  yaw = 0,
  pitch = 0,
} = {}) {
  return {
    confidence: 0.96,
    centerX,
    centerY,
    faceWidthRatio: width,
    faceHeightRatio: height,
    roll,
    yaw,
    pitch,
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

function detection(timestamp, faces) {
  return createCameraResult('top', {
    available: true,
    faceCount: faces.length,
    totalFaceCount: faces.length,
    faceDetected: faces.length > 0,
    faces,
    timestamp,
  })
}

function runStable(
  aggregator,
  start = 1000,
  end = 2200,
  faces = [createFace()],
) {
  let state

  for (let timestamp = start; timestamp <= end; timestamp += 50) {
    state = aggregator.update(detection(timestamp, faces))
  }

  return state
}

test('a small background face does not trigger multiple_faces', () => {
  const aggregator = createMultiCameraAggregator()
  const main = createFace()
  const background = createFace({
    centerX: 0.68,
    width: 0.12,
    height: 0.14,
  })
  const state = aggregator.update(
    detection(1000, [main, background]),
  )

  assert.equal(state.cameras.top.totalFaceCount, 2)
  assert.equal(state.cameras.top.roiFaceCount, 2)
  assert.equal(state.cameras.top.relevantFaceCount, 1)
  assert.equal(state.cameras.top.ignoredBackgroundFaceCount, 1)
  assert.notEqual(
    state.primaryInstruction,
    positioningInstructions.multipleFaces,
  )
})

test('a face close to the image edge is ignored by the ROI', () => {
  const aggregator = createMultiCameraAggregator()
  const state = aggregator.update(
    detection(1000, [
      createFace(),
      createFace({ centerX: 0.08, width: 0.2, height: 0.25 }),
    ]),
  )

  assert.equal(state.cameras.top.roiFaceCount, 1)
  assert.equal(state.cameras.top.relevantFaceCount, 1)
  assert.equal(state.cameras.top.faces[1].classification, 'outside_roi')
  assert.notEqual(
    state.primaryInstruction,
    positioningInstructions.multipleFaces,
  )
})

test('two comparable faces in the ROI block immediately', () => {
  const aggregator = createMultiCameraAggregator()
  const state = aggregator.update(
    detection(1000, [
      createFace({ centerX: 0.42 }),
      createFace({
        centerX: 0.65,
        width: 0.3,
        height: 0.36,
      }),
    ]),
  )

  assert.equal(state.cameras.top.relevantFaceCount, 2)
  assert.ok(
    state.cameras.top.secondaryToPrimaryAreaRatio >=
      positioningConfig.faceSelection.secondaryFaceIgnoreRatio,
  )
  assert.equal(
    state.rawInstruction,
    positioningInstructions.multipleFaces,
  )
  assert.notEqual(
    state.displayedInstruction,
    positioningInstructions.multipleFaces,
  )
  assert.equal(state.stableProgress, 0)
})

test('a sole face outside the ROI cannot become the primary face', () => {
  const aggregator = createMultiCameraAggregator()
  const state = aggregator.update(
    detection(1000, [createFace({ centerX: 0.1 })]),
  )

  assert.equal(state.cameras.top.totalFaceCount, 1)
  assert.equal(state.cameras.top.relevantFaceCount, 0)
  assert.equal(
    state.rawInstruction,
    positioningInstructions.faceOutsideRoi,
  )
})

test('brief face loss during hold_still is retained and persistent loss blocks', () => {
  const aggregator = createMultiCameraAggregator()
  const holding = runStable(aggregator, 1000, 1700)

  assert.equal(
    holding.primaryInstruction,
    positioningInstructions.holdStill,
  )

  const lost = aggregator.update(detection(1750, []))

  assert.equal(
    lost.rawInstruction,
    positioningInstructions.reacquiring,
  )
  assert.equal(lost.cameras.top.retainedDuringDetectionGrace, true)
  assert.equal(lost.positionCorrect, false)

  const persistentLoss = aggregator.update(detection(2150, []))

  assert.equal(
    persistentLoss.rawInstruction,
    positioningInstructions.faceNotDetected,
  )
  assert.equal(persistentLoss.stableProgress, 0)
  assert.equal(persistentLoss.validMeasurementCount, 0)
})

test('face loss during progress resets the progress immediately', () => {
  const aggregator = createMultiCameraAggregator()
  const progressing = runStable(aggregator)

  assert.ok(progressing.stableProgress > 0)
  const lost = aggregator.update(detection(2250, []))

  assert.equal(lost.stableProgress, 0)
  assert.equal(lost.positionCorrect, false)
  assert.notEqual(
    lost.primaryInstruction,
    positioningInstructions.holdStill,
  )
})

test('rapid alternation between one and two faces never exposes hold_still', () => {
  const aggregator = createMultiCameraAggregator()
  const one = [createFace()]
  const two = [
    createFace({ centerX: 0.42 }),
    createFace({ centerX: 0.65, width: 0.3, height: 0.36 }),
  ]

  for (let index = 0; index < 16; index += 1) {
    const state = aggregator.update(
      detection(1000 + index * 50, index % 2 ? one : two),
    )

    assert.notEqual(
      state.primaryInstruction,
      positioningInstructions.holdStill,
    )
    assert.equal(state.stableProgress, 0)
  }
})

test('rapid centered/decentered alternation stays in reacquisition', () => {
  const aggregator = createMultiCameraAggregator()
  runStable(aggregator, 1000, 1700)
  const displayedInstructions = []

  for (let index = 0; index < 16; index += 1) {
    const faces = [
      createFace({ centerX: index % 2 ? 0.5 : 0.64 }),
    ]
    const state = aggregator.update(
      detection(1750 + index * 50, faces),
    )

    displayedInstructions.push(state.primaryInstruction)
    assert.notEqual(
      state.primaryInstruction,
      positioningInstructions.holdStill,
    )
    assert.equal(state.stableProgress, 0)
  }

  const transitions = displayedInstructions.reduce(
    (count, instruction, index) =>
      index > 0 &&
      displayedInstructions[index - 1] !== instruction
        ? count + 1
        : count,
    0,
  )

  assert.ok(transitions <= 1)
})

test('the first measurement after a filter reset is reacquisition, not stillness', () => {
  const aggregator = createMultiCameraAggregator()
  aggregator.update(detection(1000, [createFace()]))
  aggregator.update(detection(1050, []))
  const reacquired = aggregator.update(
    detection(1100, [createFace()]),
  )

  assert.equal(reacquired.cameras.top.reacquiring, true)
  assert.equal(reacquired.cameras.top.centerMovementRatio, null)
  assert.equal(
    reacquired.rawInstruction,
    positioningInstructions.reacquiring,
  )
  assert.equal(reacquired.stableProgress, 0)
})

test('measurements older than 200 ms are rejected absolutely', () => {
  const aggregator = createMultiCameraAggregator()
  aggregator.update(detection(1000, [createFace()]))
  const stale = aggregator.getState(
    1000 + positioningConfig.analysis.maxDataAgeMs,
  )

  assert.equal(
    stale.rawInstruction,
    positioningInstructions.dataStale,
  )
  assert.equal(stale.cameras.top.faceDetected, false)
  assert.equal(stale.cameras.top.trackingBox, null)
  assert.deepEqual(stale.cameras.top.faces, [])
  assert.equal(stale.stableProgress, 0)
  assert.equal(stale.positionCorrect, false)
})

test('positionCorrect always implies the absence of a blocking reason', () => {
  const aggregator = createMultiCameraAggregator()
  let state = runStable(aggregator, 1000, 5200)

  assert.equal(state.positionCorrect, true)
  assert.equal(state.blockingReason, null)

  state = aggregator.update(detection(5250, []))
  assert.equal(state.positionCorrect, false)
  assert.notEqual(state.blockingReason, null)
})

test('global state exposes exactly one primary instruction and one criteria source', () => {
  const aggregator = createMultiCameraAggregator()
  const state = aggregator.update(
    detection(1000, [
      createFace(),
      createFace({ centerX: 0.65, width: 0.3, height: 0.36 }),
    ]),
  )
  const criteria = getGlobalPositionCriteria(state)

  assert.equal(typeof state.primaryInstruction, 'string')
  assert.equal('primaryInstructions' in state, false)
  assert.equal(criteria.length, 5)
  assert.equal(
    criteria.filter(({ state: value }) => value === 'current')
      .length <= 1,
    true,
  )
})

test('progress remains zero until enough confirmed valid measurements exist', () => {
  const aggregator = createMultiCameraAggregator()
  let state
  const sampleCount =
    positioningConfig.filtering.minimumValidMeasurements - 1

  for (let index = 0; index < sampleCount; index += 1) {
    state = aggregator.update(
      detection(1000 + index * 50, [createFace()]),
    )
  }

  assert.equal(state.stableProgress, 0)
  assert.equal(state.positionCorrect, false)
})

test('a critical state cancels partial validation without confirmation delay', () => {
  const aggregator = createMultiCameraAggregator()
  const progressing = runStable(aggregator)

  assert.ok(progressing.stableProgress > 0)
  const critical = aggregator.update(
    detection(2250, [
      createFace({ centerX: 0.42 }),
      createFace({
        centerX: 0.65,
        width: 0.3,
        height: 0.36,
      }),
    ]),
  )

  assert.equal(
    critical.rawInstruction,
    positioningInstructions.multipleFaces,
  )
  assert.equal(critical.stableProgress, 0)
  assert.equal(critical.validMeasurementCount, 0)
  assert.equal(critical.positionCorrect, false)
})
