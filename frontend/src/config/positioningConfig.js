const cameraIds = Object.freeze(['top', 'bottom', 'left', 'right'])

const primaryThresholds = Object.freeze({
  minDetectionConfidence: 0.85,
  horizontalTolerance: 0.05,
  verticalTolerance: 0.06,
  minFaceWidthRatio: 0.16,
  maxFaceWidthRatio: 0.28,
  /*
   * Distance hysteresis is an absolute fraction of image width.
   * too_far enters below 0.16 and exits at or above 0.17.
   * too_close enters above 0.28 and exits at or below 0.27.
   * It is intentionally independent from the global pose/centering
   * hysteresis because camera focal lengths can differ.
   */
  distanceHysteresisMargin: 0.01,
  maxRollDegrees: 5,
  maxYawDegrees: 8,
  maxPitchDegrees: 8,
  maxCenterMovementRatio: 0.015,
  maxSizeVariationRatio: 0.02,
  maxAngleVariationDegrees: 1.75,
  edgeMarginRatio: 0.025,
})

const positioningConfig = Object.freeze({
  cameraMode: 'single',
  cameraIds,
  primaryCameraId: 'top',
  targetCenter: Object.freeze({
    x: 0.5,
    y: 0.5,
  }),
  positioningRoi: Object.freeze({
    left: 0.15,
    right: 0.85,
    top: 0.08,
    bottom: 0.92,
  }),
  faceSelection: Object.freeze({
    /*
     * A secondary face is relevant when its area is at least 35% of
     * the primary face area. Equivalently, two faces are considered
     * comparable while primaryArea / secondaryArea <= 2.857142...
     */
    secondaryFaceIgnoreRatio: 0.35,
    minimumPrimaryToSecondaryAreaRatio: 1 / 0.35,
  }),
  faceTracking: Object.freeze({
    confirmationSamples: 2,
    minimumWidthRatio: 0.06,
    minimumHeightRatio: 0.08,
    minimumAreaRatio: 0.006,
    minimumAspectRatio: 0.4,
    maximumAspectRatio: 1.15,
    minimumIou: 0.2,
    maximumCenterDistance: 0.12,
    strongCenterDistance: 0.06,
    maximumRelativeAreaChange: 0.45,
    maximumRelativeAspectChange: 0.3,
  }),
  cameraDevices: Object.freeze({
    top: null,
    bottom: null,
    left: null,
    right: null,
  }),
  video: Object.freeze({
    facingMode: 'user',
    idealWidth: 1280,
    idealHeight: 720,
    fallbackWidth: 640,
    fallbackHeight: 480,
    idealFrameRate: 30,
    maxFrameRate: 30,
    mirroredPreview: true,
    storageKey: 'artimir.cameraDeviceId',
  }),
  mediaPipe: Object.freeze({
    wasmPath: 'mediapipe/wasm',
    modelPath: 'models/face_landmarker.task',
    maxFaces: 2,
    minDetectionConfidence:
      primaryThresholds.minDetectionConfidence,
    minFacePresenceConfidence: 0.85,
    minTrackingConfidence: 0.85,
  }),
  analysis: Object.freeze({
    fps: 20,
    intervalMs: 50,
    maxDataAgeMs: 200,
    noFaceRetentionMs: 0,
  }),
  filtering: Object.freeze({
    smoothingFactor: 0.28,
    hysteresisRatio: 0.18,
    minimumValidMeasurements: 20,
    stableDurationMs: 3000,
    criticalDisplayConfirmSamples: 2,
    criticalDisplayConfirmMs: 150,
    multipleFacesDisplayConfirmMs: 200,
    noFaceDisplayConfirmMs: 200,
    nonCriticalDisplayConfirmSamples: 4,
    nonCriticalDisplayConfirmMs: 500,
    minimumDisplayedInstructionMs: 500,
  }),
  poseConvention: Object.freeze({
    /*
     * Raw, non-mirrored camera coordinates are used for validation.
     * roll  > 0: clockwise tilt in the raw image.
     * yaw   > 0: face turns toward image right.
     * pitch > 0: chin moves downward.
     * Signs can be calibrated here without changing UI logic.
     */
    rollSign: 1,
    yawSign: 1,
    pitchSign: 1,
  }),
  cameraThresholds: Object.freeze({
    top: primaryThresholds,
    bottom: Object.freeze({
      minDetectionConfidence: 0.72,
      minFaceWidthRatio: 0.2,
      maxFaceWidthRatio: 0.58,
      maxRollDegrees: 12,
      maxYawDegrees: 18,
      maxPitchDegrees: 18,
      maxCenterMovementRatio: 0.025,
      maxSizeVariationRatio: 0.035,
      maxAngleVariationDegrees: 3.5,
      edgeMarginRatio: 0.035,
    }),
    left: Object.freeze({
      minDetectionConfidence: 0.72,
      minFaceWidthRatio: 0.2,
      maxFaceWidthRatio: 0.58,
      maxRollDegrees: 12,
      maxYawDegrees: 24,
      maxPitchDegrees: 18,
      maxCenterMovementRatio: 0.025,
      maxSizeVariationRatio: 0.035,
      maxAngleVariationDegrees: 3.5,
      edgeMarginRatio: 0.035,
    }),
    right: Object.freeze({
      minDetectionConfidence: 0.72,
      minFaceWidthRatio: 0.2,
      maxFaceWidthRatio: 0.58,
      maxRollDegrees: 12,
      maxYawDegrees: 24,
      maxPitchDegrees: 18,
      maxCenterMovementRatio: 0.025,
      maxSizeVariationRatio: 0.035,
      maxAngleVariationDegrees: 3.5,
      edgeMarginRatio: 0.035,
    }),
  }),
  completionDelayMs: 800,
})

export { cameraIds }
export default positioningConfig
