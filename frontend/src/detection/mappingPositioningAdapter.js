import { cameraIds } from '../config/positioningConfig.js'
import { createCameraResult } from './cameraResult.js'

/*
 * Future boundary for the local mapping service.
 * It deliberately contains no WebSocket and performs no network operation.
 * Raw images, video frames and landmarks are rejected at this boundary.
 */
function adaptMappingCameraResult(payload) {
  if (
    !payload ||
    !cameraIds.includes(payload.cameraId) ||
    'image' in payload ||
    'video' in payload ||
    'landmarks' in payload
  ) {
    throw new Error('Invalid mapping positioning payload')
  }

  return createCameraResult(payload.cameraId, {
    available: Boolean(payload.available),
    faceCount: Number(payload.faceCount ?? 0),
    faceDetected: Boolean(payload.faceDetected),
    confidence: Number(payload.confidence ?? 0),
    centerX: payload.centerX ?? null,
    centerY: payload.centerY ?? null,
    faceWidthRatio: payload.faceWidthRatio ?? null,
    faceHeightRatio: payload.faceHeightRatio ?? null,
    roll: payload.roll ?? null,
    yaw: payload.yaw ?? null,
    pitch: payload.pitch ?? null,
    centerMovementRatio: payload.centerMovementRatio ?? null,
    sizeVariationRatio: payload.sizeVariationRatio ?? null,
    angleVariationDegrees:
      payload.angleVariationDegrees ?? null,
    stability: payload.stability ?? 0,
    landmarksAvailable: Boolean(payload.landmarksAvailable),
    essentialLandmarksPresent: Boolean(
      payload.essentialLandmarksPresent,
    ),
    overlapRegions: {
      nose: Boolean(payload.overlapRegions?.nose),
      eyes: Boolean(payload.overlapRegions?.eyes),
      mouth: Boolean(payload.overlapRegions?.mouth),
      cheeks: Boolean(payload.overlapRegions?.cheeks),
    },
    trackingBox: payload.trackingBox ?? null,
    timestamp: Number(payload.timestamp ?? 0),
  })
}

export default adaptMappingCameraResult
