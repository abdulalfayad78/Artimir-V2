import assert from 'node:assert/strict'
import test from 'node:test'
import createMediaPipeFaceSource from '../frontend/src/detection/createMediaPipeFaceSource.js'
import {
  getCameraErrorCode,
  stopMediaStream,
} from '../frontend/src/hooks/useCameraStream.js'

test('camera permission and absence errors stay explicit', () => {
  assert.equal(
    getCameraErrorCode({ name: 'NotAllowedError' }),
    'permission_denied',
  )
  assert.equal(
    getCameraErrorCode({ name: 'NotFoundError' }),
    'no_camera',
  )
})

test('stopping a media stream stops every webcam track', () => {
  let stoppedTracks = 0
  const stream = {
    getTracks: () => [
      { stop: () => stoppedTracks += 1 },
      { stop: () => stoppedTracks += 1 },
    ],
  }

  stopMediaStream(stream)
  assert.equal(stoppedTracks, 2)
})

test('disposing FaceLandmarker cancels future analyses', async () => {
  const originalWindow = globalThis.window
  const originalHtmlMediaElement = globalThis.HTMLMediaElement
  let currentTime = 0
  let detectionCalls = 0
  let closeCalls = 0
  const videoElement = {
    readyState: 2,
    videoWidth: 1280,
    videoHeight: 720,
    get currentTime() {
      currentTime += 0.05
      return currentTime
    },
  }

  globalThis.window = {
    clearTimeout,
    location: {
      origin: 'http://localhost:5173',
    },
    setTimeout,
  }
  globalThis.HTMLMediaElement = {
    HAVE_CURRENT_DATA: 2,
    HAVE_METADATA: 1,
  }

  try {
    const source = await createMediaPipeFaceSource({
      videoElement,
      onDetection: () => {},
      onError: (error) => {
        throw error
      },
      landmarkerFactory: async () => ({
        close: () => closeCalls += 1,
        detectForVideo: () => {
          detectionCalls += 1
          return {
            faceLandmarks: [],
            facialTransformationMatrixes: [],
          }
        },
      }),
    })

    await source.start()
    await new Promise((resolve) => setTimeout(resolve, 130))
    source.dispose()
    const callsAfterDispose = detectionCalls
    await new Promise((resolve) => setTimeout(resolve, 130))

    assert.ok(callsAfterDispose >= 2)
    assert.equal(detectionCalls, callsAfterDispose)
    assert.equal(closeCalls, 1)
  } finally {
    globalThis.window = originalWindow
    globalThis.HTMLMediaElement = originalHtmlMediaElement
  }
})

test('starting FaceLandmarker twice keeps a single active analysis loop and dispose is idempotent', async () => {
  const originalWindow = globalThis.window
  const originalHtmlMediaElement = globalThis.HTMLMediaElement
  let currentTime = 0
  let detectionCalls = 0
  let closeCalls = 0
  const videoElement = {
    readyState: 2,
    videoWidth: 1280,
    videoHeight: 720,
    get currentTime() {
      currentTime += 0.05
      return currentTime
    },
  }

  globalThis.window = {
    clearTimeout,
    location: {
      origin: 'http://localhost:5173',
    },
    setTimeout,
  }
  globalThis.HTMLMediaElement = {
    HAVE_CURRENT_DATA: 2,
    HAVE_METADATA: 1,
  }

  try {
    const source = await createMediaPipeFaceSource({
      videoElement,
      onDetection: () => {},
      onError: (error) => {
        throw error
      },
      landmarkerFactory: async () => ({
        close: () => closeCalls += 1,
        detectForVideo: () => {
          detectionCalls += 1
          return {
            faceLandmarks: [],
            facialTransformationMatrixes: [],
          }
        },
      }),
    })

    await Promise.all([source.start(), source.start()])
    await new Promise((resolve) => setTimeout(resolve, 130))
    source.stop()
    const callsAfterStop = detectionCalls
    await new Promise((resolve) => setTimeout(resolve, 130))
    source.dispose()
    source.dispose()

    assert.ok(callsAfterStop >= 2)
    assert.equal(detectionCalls, callsAfterStop)
    assert.equal(closeCalls, 1)
  } finally {
    globalThis.window = originalWindow
    globalThis.HTMLMediaElement = originalHtmlMediaElement
  }
})
