import assert from 'node:assert/strict'
import test from 'node:test'
import positioningConfig from '../frontend/src/config/positioningConfig.js'
import {
  calculateEulerAngles,
  calculateRollFromLandmarks,
} from '../frontend/src/detection/faceLandmarkMetrics.js'

const degreesToRadians = Math.PI / 180

function createRotationMatrix({
  pitch = 0,
  yaw = 0,
  roll = 0,
}) {
  const x = pitch * degreesToRadians
  const y = yaw * degreesToRadians
  const z = roll * degreesToRadians
  const cx = Math.cos(x)
  const sx = Math.sin(x)
  const cy = Math.cos(y)
  const sy = Math.sin(y)
  const cz = Math.cos(z)
  const sz = Math.sin(z)

  return {
    rows: 4,
    columns: 4,
    data: [
      cz * cy,
      cz * sy * sx - sz * cx,
      cz * sy * cx + sz * sx,
      0,
      sz * cy,
      sz * sy * sx + cz * cx,
      sz * sy * cx - cz * sx,
      0,
      -sy,
      cy * sx,
      cy * cx,
      0,
      0,
      0,
      0,
      1,
    ],
  }
}

for (const angles of [
  { pitch: 6, yaw: 7, roll: 4 },
  { pitch: -6, yaw: -7, roll: -4 },
]) {
  test(`Euler angles preserve signs for ${JSON.stringify(angles)}`, () => {
    const result = calculateEulerAngles(
      createRotationMatrix(angles),
      positioningConfig.poseConvention,
    )

    assert.ok(Math.abs(result.pitch - angles.pitch) < 0.001)
    assert.ok(Math.abs(result.yaw - angles.yaw) < 0.001)
    assert.ok(Math.abs(result.roll - angles.roll) < 0.001)
  })
}

test('landmark roll is positive clockwise and negative counter-clockwise', () => {
  const landmarks = Array.from({ length: 363 }, () => ({
    x: 0.5,
    y: 0.5,
    z: 0,
  }))

  for (const index of [33, 133]) {
    landmarks[index] = { x: 0.35, y: 0.42, z: 0 }
  }
  for (const index of [263, 362]) {
    landmarks[index] = { x: 0.65, y: 0.48, z: 0 }
  }

  assert.ok(calculateRollFromLandmarks(landmarks) > 0)

  for (const index of [263, 362]) {
    landmarks[index] = { x: 0.65, y: 0.36, z: 0 }
  }

  assert.ok(calculateRollFromLandmarks(landmarks) < 0)
})
