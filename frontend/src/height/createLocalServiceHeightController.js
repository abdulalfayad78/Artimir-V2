import {
  createHeightControllerError,
  createHeightControllerState,
  heightControllerStatuses,
} from './heightControllerState.js'

function createLocalServiceHeightController({ config }) {
  let state = createHeightControllerState(config, {
    mode: 'localService',
    currentPositionMm: null,
    positionKnown: false,
  })
  let destroyed = false
  let commandInProgress = false
  let pollTimer = null
  let activeController = null
  const listeners = new Set()

  const getStatus = () => ({ ...state })

  const emit = () => {
    const snapshot = getStatus()
    listeners.forEach((listener) => listener(snapshot))
  }

  const updateState = (patch) => {
    state = createHeightControllerState(config, {
      ...state,
      ...patch,
      mode: 'localService',
      updatedAt: Date.now(),
    })
    emit()
  }

  const assertAlive = () => {
    if (destroyed) {
      throw createHeightControllerError('CONTROLLER_DESTROYED')
    }
  }

  const createServiceError = (code, message = code) =>
    createHeightControllerError(code, message)

  const request = async (path, options = {}) => {
    assertAlive()
    const controller = new AbortController()
    activeController = controller
    const timeout = window.setTimeout(() => {
      controller.abort()
    }, config.motorServiceRequestTimeoutMs)

    try {
      const response = await fetch(`${config.motorServiceUrl}${path}`, {
        ...options,
        signal: controller.signal,
        headers: {
          ...(options.body ? { 'Content-Type': 'application/json' } : {}),
          ...options.headers,
        },
      })

      if (!response.ok) {
        throw createServiceError(
          'LOCAL_SERVICE_HTTP_ERROR',
          `HTTP ${response.status}`,
        )
      }

      return response.json()
    } catch (error) {
      if (error.name === 'AbortError') {
        throw createServiceError('LOCAL_SERVICE_TIMEOUT')
      }

      if (error.code) {
        throw error
      }

      throw createServiceError('LOCAL_SERVICE_UNAVAILABLE')
    } finally {
      window.clearTimeout(timeout)
      if (activeController === controller) {
        activeController = null
      }
    }
  }

  const inferMovingStatus = (pythonStatus) => {
    const current = Number.isFinite(pythonStatus.position_mm)
      ? pythonStatus.position_mm
      : state.currentPositionMm

    if (
      Number.isFinite(state.targetPositionMm) &&
      Number.isFinite(current)
    ) {
      return state.targetPositionMm >= current
        ? heightControllerStatuses.movingUp
        : heightControllerStatuses.movingDown
    }

    return heightControllerStatuses.movingUp
  }

  const mapStatus = (pythonStatus) => {
    const positionKnown = pythonStatus.position_known === true
    const currentPositionMm = positionKnown
      ? pythonStatus.position_mm
      : state.currentPositionMm
    const connection = pythonStatus.connection
    const motion = pythonStatus.motion
    const lastError = pythonStatus.last_error ?? null
    let status = heightControllerStatuses.disconnected

    if (connection === 'connected') {
      if (motion === 'homing') {
        status = heightControllerStatuses.homing
      } else if (motion === 'moving') {
        status = inferMovingStatus(pythonStatus)
      } else if (motion === 'stopped') {
        status = heightControllerStatuses.stopped
      } else if (motion === 'error') {
        status = heightControllerStatuses.error
      } else {
        status = heightControllerStatuses.idle
      }
    } else if (connection === 'error') {
      status = heightControllerStatuses.error
    }

    return {
      connected: connection === 'connected',
      status,
      currentPositionMm,
      positionKnown,
      error: lastError?.code ?? null,
      lastError,
      updatedAt: Date.parse(pythonStatus.updated_at) || Date.now(),
    }
  }

  const applyServiceStatus = (pythonStatus) => {
    updateState(mapStatus(pythonStatus))
  }

  const failFromError = (error) => {
    const code = error.code ?? 'LOCAL_SERVICE_ERROR'
    updateState({
      connected: code !== 'LOCAL_SERVICE_UNAVAILABLE',
      status:
        code === 'LOCAL_SERVICE_UNAVAILABLE'
          ? heightControllerStatuses.disconnected
          : heightControllerStatuses.error,
      error: code,
      lastError: {
        code,
        message: error.message ?? code,
      },
    })
  }

  const refreshStatus = async () => {
    const pythonStatus = await request('/motor/status')
    applyServiceStatus(pythonStatus)
    return getStatus()
  }

  const pollStatus = async () => {
    if (destroyed || commandInProgress) {
      return
    }

    try {
      await refreshStatus()
    } catch (error) {
      failFromError(error)
    } finally {
      if (!destroyed) {
        pollTimer = window.setTimeout(
          pollStatus,
          config.motorServicePollIntervalMs,
        )
      }
    }
  }

  const startPolling = () => {
    if (pollTimer === null) {
      pollTimer = window.setTimeout(
        pollStatus,
        config.motorServicePollIntervalMs,
      )
    }
  }

  const stopPolling = () => {
    if (pollTimer !== null) {
      window.clearTimeout(pollTimer)
      pollTimer = null
    }
  }

  const connect = async () => {
    assertAlive()
    const health = await request('/health')
    applyServiceStatus(health.status)
    startPolling()
    return getStatus()
  }

  const disconnect = async () => {
    assertAlive()
    stopPolling()
    activeController?.abort()
    updateState({
      connected: false,
      status: heightControllerStatuses.disconnected,
      targetPositionMm: null,
    })
    return getStatus()
  }

  const runCommand = async (command) => {
    assertAlive()

    if (commandInProgress) {
      throw createServiceError('COMMAND_IN_PROGRESS')
    }

    commandInProgress = true
    try {
      const result = await command()
      if (result?.status) {
        applyServiceStatus(result.status)
      }
      if (result?.ok === false && result.error) {
        throw createServiceError(
          result.error.code,
          result.error.message,
        )
      }
      return getStatus()
    } catch (error) {
      failFromError(error)
      throw error
    } finally {
      commandInProgress = false
    }
  }

  const stop = async () => {
    assertAlive()
    try {
      const result = await request('/motor/stop', { method: 'POST' })
      if (result?.status) {
        applyServiceStatus(result.status)
      }
      if (result?.ok === false && result.error) {
        throw createServiceError(
          result.error.code,
          result.error.message,
        )
      }
      return getStatus()
    } catch (error) {
      failFromError(error)
      throw error
    }
  }

  const home = () =>
    runCommand(() => {
      updateState({
        status: heightControllerStatuses.homing,
        currentPositionMm: null,
        positionKnown: false,
        targetPositionMm: null,
        error: null,
        lastError: null,
      })
      return request('/motor/home', { method: 'POST' })
    })

  const moveToMm = (positionMm) =>
    runCommand(() => {
      if (!state.positionKnown) {
        throw createServiceError('POSITION_UNKNOWN')
      }

      const status =
        Number.isFinite(state.currentPositionMm) &&
        positionMm < state.currentPositionMm
          ? heightControllerStatuses.movingDown
          : heightControllerStatuses.movingUp

      updateState({
        status,
        targetPositionMm: positionMm,
        error: null,
        lastError: null,
      })
      return request('/motor/move-to', {
        method: 'POST',
        body: JSON.stringify({ target_mm: positionMm }),
      })
    })

  const clearLocalError = () => {
    assertAlive()
    updateState({
      error: null,
      lastError: null,
      status: state.connected
        ? heightControllerStatuses.idle
        : heightControllerStatuses.disconnected,
    })
    return getStatus()
  }

  const destroy = () => {
    if (destroyed) {
      return
    }

    destroyed = true
    stopPolling()
    activeController?.abort()
    listeners.clear()
  }

  return {
    mode: 'localService',
    clearEmergencyStop: clearLocalError,
    clearLocalError,
    connect,
    destroy,
    disconnect,
    emergencyStop: stop,
    getStatus,
    home,
    moveRelativeMm: async () => {
      throw createServiceError('RELATIVE_MOVE_DISABLED')
    },
    moveToMm,
    refreshStatus,
    reset: clearLocalError,
    simulateError: clearLocalError,
    stop,
    subscribe: (listener) => {
      assertAlive()
      listeners.add(listener)
      listener(getStatus())
      return () => listeners.delete(listener)
    },
  }
}

export default createLocalServiceHeightController
