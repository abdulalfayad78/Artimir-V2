import { useCallback, useEffect, useRef, useState } from 'react'
import positioningConfig from '../config/positioningConfig.js'

const cameraStates = Object.freeze({
  loading: 'camera_loading',
  active: 'camera_active',
  error: 'camera_error',
})

function stopMediaStream(mediaStream) {
  mediaStream?.getTracks().forEach((track) => track.stop())
}

function getStoredDeviceId() {
  try {
    return localStorage.getItem(positioningConfig.video.storageKey)
  } catch {
    return null
  }
}

function storeDeviceId(deviceId) {
  try {
    if (deviceId) {
      localStorage.setItem(
        positioningConfig.video.storageKey,
        deviceId,
      )
    } else {
      localStorage.removeItem(positioningConfig.video.storageKey)
    }
  } catch {
    // Camera selection remains usable in memory if storage is blocked.
  }
}

function getCameraErrorCode(error) {
  switch (error?.name) {
    case 'NotAllowedError':
      return 'permission_denied'
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'no_camera'
    case 'NotReadableError':
    case 'TrackStartError':
      return 'camera_busy'
    case 'OverconstrainedError':
    case 'ConstraintNotSatisfiedError':
      return 'camera_overconstrained'
    case 'SecurityError':
      return 'camera_security'
    case 'AbortError':
      return 'stream_interrupted'
    case 'TypeError':
      return 'camera_unsupported'
    default:
      return 'unknown'
  }
}

function createVideoConstraints(deviceId, useFallback = false) {
  const width = useFallback
    ? positioningConfig.video.fallbackWidth
    : positioningConfig.video.idealWidth
  const height = useFallback
    ? positioningConfig.video.fallbackHeight
    : positioningConfig.video.idealHeight

  return {
    ...(deviceId
      ? {
          deviceId: {
            exact: deviceId,
          },
        }
      : {
          facingMode: positioningConfig.video.facingMode,
        }),
    width: {
      ideal: width,
    },
    height: {
      ideal: height,
    },
    frameRate: {
      ideal: positioningConfig.video.idealFrameRate,
      max: positioningConfig.video.maxFrameRate,
    },
  }
}

async function requestVideoStream(deviceId) {
  const request = (useFallback) =>
    navigator.mediaDevices.getUserMedia({
      video: createVideoConstraints(deviceId, useFallback),
      audio: false,
    })

  try {
    return await request(false)
  } catch (error) {
    if (
      error?.name !== 'OverconstrainedError' &&
      error?.name !== 'ConstraintNotSatisfiedError'
    ) {
      throw error
    }

    return request(true)
  }
}

function useCameraStream({ enabled = false } = {}) {
  const [status, setStatus] = useState(cameraStates.loading)
  const [errorCode, setErrorCode] = useState(null)
  const [stream, setStream] = useState(null)
  const [availableCameras, setAvailableCameras] = useState([])
  const initialDeviceIdRef = useRef(getStoredDeviceId())
  const [selectedDeviceId, setSelectedDeviceId] = useState(
    initialDeviceIdRef.current,
  )
  const selectedDeviceIdRef = useRef(initialDeviceIdRef.current)
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const requestIdRef = useRef(0)
  const requestInProgressRef = useRef(false)
  const mountedRef = useRef(true)
  const removeTrackListenerRef = useRef(null)

  const releaseStream = useCallback(() => {
    removeTrackListenerRef.current?.()
    removeTrackListenerRef.current = null

    if (streamRef.current) {
      stopMediaStream(streamRef.current)
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  const stopCamera = useCallback(() => {
    requestIdRef.current += 1
    requestInProgressRef.current = false
    releaseStream()

    if (mountedRef.current) {
      setStream(null)
    }
  }, [releaseStream])

  const startCamera = useCallback(
    async (deviceId = selectedDeviceIdRef.current) => {
      if (!enabled || requestInProgressRef.current) {
        return
      }

      const currentRequestId = requestIdRef.current + 1
      requestIdRef.current = currentRequestId
      requestInProgressRef.current = true
      releaseStream()
      setStream(null)
      setStatus(cameraStates.loading)
      setErrorCode(null)

      if (!navigator.mediaDevices?.getUserMedia) {
        requestInProgressRef.current = false
        setStatus(cameraStates.error)
        setErrorCode('camera_unsupported')
        return
      }

      try {
        let nextStream

        try {
          nextStream = await requestVideoStream(deviceId)
        } catch (error) {
          if (
            deviceId &&
            ['NotFoundError', 'OverconstrainedError'].includes(
              error?.name,
            )
          ) {
            storeDeviceId(null)
            selectedDeviceIdRef.current = null
            setSelectedDeviceId(null)
            nextStream = await requestVideoStream(null)
          } else {
            throw error
          }
        }

        if (
          !mountedRef.current ||
          currentRequestId !== requestIdRef.current
        ) {
          stopMediaStream(nextStream)
          return
        }

        const videoTrack = nextStream.getVideoTracks()[0]

        if (!videoTrack) {
          stopMediaStream(nextStream)
          throw new DOMException('No video track', 'NotFoundError')
        }

        const handleTrackEnded = () => {
          if (
            mountedRef.current &&
            streamRef.current === nextStream
          ) {
            releaseStream()
            setStream(null)
            setStatus(cameraStates.error)
            setErrorCode('stream_interrupted')
          }
        }

        videoTrack.addEventListener('ended', handleTrackEnded)
        removeTrackListenerRef.current = () =>
          videoTrack.removeEventListener('ended', handleTrackEnded)
        streamRef.current = nextStream

        const activeDeviceId = videoTrack.getSettings().deviceId ?? null
        const devices = await navigator.mediaDevices.enumerateDevices()
        const videoInputs = devices.filter(
          (device) => device.kind === 'videoinput',
        )

        if (
          !mountedRef.current ||
          currentRequestId !== requestIdRef.current
        ) {
          stopMediaStream(nextStream)
          return
        }

        setAvailableCameras(videoInputs)
        selectedDeviceIdRef.current = activeDeviceId
        setSelectedDeviceId(activeDeviceId)
        storeDeviceId(activeDeviceId)
        setStream(nextStream)
        setStatus(cameraStates.active)
      } catch (error) {
        if (
          mountedRef.current &&
          currentRequestId === requestIdRef.current
        ) {
          releaseStream()
          setStream(null)
          setStatus(cameraStates.error)
          setErrorCode(getCameraErrorCode(error))
        }
      } finally {
        if (currentRequestId === requestIdRef.current) {
          requestInProgressRef.current = false
        }
      }
    },
    [enabled, releaseStream],
  )

  const changeCamera = useCallback(
    (deviceId) => {
      const nextDeviceId = deviceId || null
      selectedDeviceIdRef.current = nextDeviceId
      setSelectedDeviceId(nextDeviceId)
      storeDeviceId(nextDeviceId)
      stopCamera()
      startCamera(nextDeviceId)
    },
    [startCamera, stopCamera],
  )

  useEffect(() => {
    const video = videoRef.current

    if (!video || !stream) {
      return undefined
    }

    video.srcObject = stream
    const playPromise = video.play()

    if (playPromise) {
      playPromise.catch(() => {
        if (mountedRef.current) {
          stopCamera()
          setStatus(cameraStates.error)
          setErrorCode('stream_interrupted')
        }
      })
    }

    return () => {
      if (video.srcObject === stream) {
        video.srcObject = null
      }
    }
  }, [stopCamera, stream])

  useEffect(() => {
    mountedRef.current = true

    return () => {
      mountedRef.current = false
      requestIdRef.current += 1
      releaseStream()
    }
  }, [releaseStream])

  useEffect(() => {
    if (!enabled) {
      stopCamera()
    }
  }, [enabled, stopCamera])

  return {
    availableCameras,
    changeCamera,
    errorCode,
    selectedDeviceId,
    startCamera,
    status,
    stopCamera,
    stream,
    videoRef,
  }
}

export { cameraStates, getCameraErrorCode, stopMediaStream }
export default useCameraStream
