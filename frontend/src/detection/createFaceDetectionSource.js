import createFaceDetectorSource from './createFaceDetectorSource.js'
import createMediaPipeFaceSource from './createMediaPipeFaceSource.js'

async function createFaceDetectionSource(options) {
  try {
    return await createMediaPipeFaceSource(options)
  } catch (mediaPipeError) {
    if (typeof window.FaceDetector === 'function') {
      return createFaceDetectorSource(options)
    }

    const error = new Error('No face detection engine is available')
    error.cause = mediaPipeError
    throw error
  }
}

export default createFaceDetectionSource
