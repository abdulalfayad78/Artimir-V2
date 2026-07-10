import positioningConfig from '../config/positioningConfig.js'

function createInitialPositioningCompletionState() {
  return {
    completionCallbackCalled: false,
    completionLatched: false,
    socketEventSent: false,
  }
}

function createPositioningCompletionController({
  clock = window,
  completionDelayMs = positioningConfig.completionDelayMs,
  onComplete,
  onStateChange = () => {},
  shutdown = () => {},
} = {}) {
  let timer = null
  let destroyed = false
  let completionPromise = null
  let state = createInitialPositioningCompletionState()

  const emit = () => onStateChange({ ...state })

  const setState = (patch) => {
    state = {
      ...state,
      ...patch,
    }
    emit()
  }

  const clearTimer = () => {
    if (timer !== null) {
      clock.clearTimeout(timer)
      timer = null
    }
  }

  const trigger = () => {
    if (destroyed || state.completionLatched) {
      return completionPromise
    }

    setState({ completionLatched: true })
    shutdown()

    completionPromise = new Promise((resolve) => {
      timer = clock.setTimeout(() => {
        timer = null

        if (destroyed || state.completionCallbackCalled) {
          resolve(null)
          return
        }

        setState({ completionCallbackCalled: true })
        Promise.resolve(onComplete?.())
          .then((result) => {
            if (!destroyed) {
              setState({ socketEventSent: true })
            }
            resolve(result)
          })
          .catch((error) => {
            resolve(error)
          })
      }, completionDelayMs)
    })

    return completionPromise
  }

  const evaluate = (globalState) => {
    if (globalState?.positionCorrect) {
      trigger()
    }

    return { ...state }
  }

  const destroy = () => {
    destroyed = true
    clearTimer()
  }

  return {
    destroy,
    evaluate,
    getState: () => ({ ...state }),
    trigger,
  }
}

export {
  createInitialPositioningCompletionState,
  createPositioningCompletionController,
}
