const heightObservationConfig = Object.freeze({
  /*
   * Raw camera coordinates are normalized:
   * - Y = 0 at the top of the image.
   * - Y = 1 at the bottom of the image.
   *
   * verticalError = eyeCenterY - targetEyeY.
   * - verticalError < 0: eyes are too high in the image.
   * - verticalError > 0: eyes are too low in the image.
   */
  targetEyeY: 0.5,
  heightTolerance: 0.025,
  heightHysteresis: 0.008,
  minimumStableDurationMs: 600,
  minimumStableSamples: 8,
  maximumDataAgeMs: 250,
  recommendationConfirmationMs: 400,
  minimumRecommendationDisplayMs: 500,
  cameraVerticalDirection: 'normal',
  heightDirectionCalibrationMode: true,
})

export default heightObservationConfig
