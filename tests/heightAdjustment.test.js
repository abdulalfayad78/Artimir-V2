import assert from 'node:assert/strict'
import test from 'node:test'

import heightAdjustmentConfig from '../frontend/src/config/heightAdjustmentConfig.js'
import createHeightAdjustmentOrchestrator from '../frontend/src/height/createHeightAdjustmentOrchestrator.js'
import createHeightController from '../frontend/src/height/createHeightController.js'
import createLocalServiceHeightController from '../frontend/src/height/createLocalServiceHeightController.js'
import createSimulatedHeightController from '../frontend/src/height/createSimulatedHeightController.js'
import { shouldNavigateAfterHeightAdjustment } from '../frontend/src/height/heightAdjustmentNavigation.js'
import { heightControllerStatuses } from '../frontend/src/height/heightControllerState.js'
import { getDisplayRouteForSessionStatus } from '../frontend/src/navigation/displaySessionRoutes.js'
import { routes } from '../frontend/src/navigation/hashNavigation.js'
import { SESSION_STATUSES } from '../shared/sessionProtocol.js'

function createFakeClock() {
  let currentTime = 0
  let nextId = 1
  const tasks = new Map()

  const schedule = (callback, delay, interval = null) => {
    const id = nextId
    nextId += 1
    tasks.set(id, {
      callback,
      interval,
      runAt: currentTime + delay,
    })
    return id
  }

  const advance = (durationMs) => {
    const targetTime = currentTime + durationMs

    while (true) {
      let nextTaskId = null
      let nextTask = null

      for (const [id, task] of tasks) {
        if (
          task.runAt <= targetTime &&
          (!nextTask || task.runAt < nextTask.runAt)
        ) {
          nextTaskId = id
          nextTask = task
        }
      }

      if (!nextTask) {
        break
      }

      currentTime = nextTask.runAt

      if (nextTask.interval === null) {
        tasks.delete(nextTaskId)
      } else {
        nextTask.runAt += nextTask.interval
      }

      nextTask.callback()
    }

    currentTime = targetTime
  }

  return {
    advance,
    clearInterval: (id) => tasks.delete(id),
    clearTimeout: (id) => tasks.delete(id),
    now: () => currentTime,
    pendingCount: () => tasks.size,
    setInterval: (callback, delay) =>
      schedule(callback, delay, delay),
    setTimeout: (callback, delay) =>
      schedule(callback, delay),
  }
}

const fastConfig = Object.freeze({
  ...heightAdjustmentConfig,
  simulationSpeedMmPerSecond: 1000,
  updateIntervalMs: 10,
  measuringDurationMs: 20,
  settlingDurationMs: 20,
  verificationDurationMs: 20,
  completionNavigationDelayMs: 20,
  maximumMovementDurationMs: 1000,
})

async function flushPromises() {
  await Promise.resolve()
  await Promise.resolve()
}

function installBrowserTestGlobals({ fetchImpl } = {}) {
  const timers = new Set()
  globalThis.window = {
    setTimeout: (callback, delay) => {
      const timer = setTimeout(callback, delay)
      timers.add(timer)
      return timer
    },
    clearTimeout: (timer) => {
      clearTimeout(timer)
      timers.delete(timer)
    },
    confirm: () => true,
  }
  globalThis.fetch = fetchImpl ?? globalThis.fetch
  return () => {
    for (const timer of timers) {
      clearTimeout(timer)
    }
    timers.clear()
    delete globalThis.window
    delete globalThis.fetch
  }
}

const localServiceConfig = Object.freeze({
  ...heightAdjustmentConfig,
  controllerMode: 'localService',
  motorServiceUrl: 'http://127.0.0.1:8000',
  motorServiceRequestTimeoutMs: 50,
  motorServicePollIntervalMs: 1000,
})

const connectedUnknownStatus = {
  mode: 'hardware',
  connection: 'connected',
  motion: 'ready',
  position_mm: null,
  position_known: false,
  updated_at: '2026-07-07T00:00:00Z',
  last_error: null,
}

const connectedKnownStatus = {
  ...connectedUnknownStatus,
  position_mm: 5,
  position_known: true,
}

function createJsonResponse(payload, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => payload,
  }
}

test('the simulated controller moves upward and downward progressively', async () => {
  const clock = createFakeClock()
  const controller = createSimulatedHeightController({
    config: fastConfig,
    clock,
  })
  const statuses = []
  controller.subscribe((state) => statuses.push(state.status))

  await controller.connect()
  const upwardMovement = controller.moveToMm(300)
  clock.advance(60)
  await upwardMovement

  assert.equal(controller.getStatus().currentPositionMm, 300)
  assert.ok(statuses.includes(heightControllerStatuses.movingUp))

  const downwardMovement = controller.moveToMm(270)
  clock.advance(40)
  await downwardMovement

  assert.equal(controller.getStatus().currentPositionMm, 270)
  assert.ok(statuses.includes(heightControllerStatuses.movingDown))
  assert.equal(controller.getStatus().status, heightControllerStatuses.idle)
})

test('limits and concurrent movement commands are rejected', async () => {
  const clock = createFakeClock()
  const controller = createSimulatedHeightController({
    config: fastConfig,
    clock,
  })
  await controller.connect()

  assert.throws(
    () => controller.moveToMm(fastConfig.maxPositionMm + 1),
    { code: 'TARGET_OUT_OF_RANGE' },
  )

  const firstMovement = controller.moveToMm(300)
  const stoppedMovement = assert.rejects(firstMovement, {
    code: 'MOVEMENT_STOPPED',
  })

  assert.throws(
    () => controller.moveRelativeMm(5),
    { code: 'COMMAND_IN_PROGRESS' },
  )

  controller.stop()
  await stoppedMovement
  assert.equal(
    controller.getStatus().status,
    heightControllerStatuses.stopped,
  )
})

test('emergency stop blocks movement until it is explicitly cleared', async () => {
  const clock = createFakeClock()
  const controller = createSimulatedHeightController({
    config: fastConfig,
    clock,
  })
  await controller.connect()

  const movement = controller.moveToMm(300)
  const interruptedMovement = assert.rejects(movement, {
    code: 'EMERGENCY_STOP_ACTIVE',
  })
  controller.emergencyStop()
  await interruptedMovement

  assert.equal(controller.getStatus().emergencyStopActive, true)
  assert.throws(
    () => controller.moveRelativeMm(5),
    { code: 'EMERGENCY_STOP_ACTIVE' },
  )

  controller.clearEmergencyStop()
  const resumedMovement = controller.moveRelativeMm(5)
  clock.advance(10)
  await resumedMovement
  assert.equal(controller.getStatus().emergencyStopActive, false)
})

test('movement timeout and simulated errors use normalized error state', async () => {
  const clock = createFakeClock()
  const timeoutConfig = {
    ...fastConfig,
    simulationSpeedMmPerSecond: 1,
    maximumMovementDurationMs: 100,
  }
  const controller = createSimulatedHeightController({
    config: timeoutConfig,
    clock,
  })
  await controller.connect()

  const movement = controller.moveToMm(300)
  const timeout = assert.rejects(movement, {
    code: 'MOVEMENT_TIMEOUT',
  })
  clock.advance(100)
  await timeout

  assert.equal(controller.getStatus().status, heightControllerStatuses.error)
  assert.equal(controller.getStatus().error, 'MOVEMENT_TIMEOUT')

  controller.reset()
  controller.simulateError()
  assert.equal(controller.getStatus().error, 'SIMULATED_ERROR')
})

test('destroy cancels every controller timer and rejects further commands', async () => {
  const clock = createFakeClock()
  const controller = createSimulatedHeightController({
    config: fastConfig,
    clock,
  })
  await controller.connect()

  const movement = controller.moveToMm(300)
  const destruction = assert.rejects(movement, {
    code: 'CONTROLLER_DESTROYED',
  })
  assert.equal(clock.pendingCount(), 2)

  controller.destroy()
  await destruction

  assert.equal(clock.pendingCount(), 0)
  assert.throws(() => controller.stop(), {
    code: 'CONTROLLER_DESTROYED',
  })
})

test('hardware mode fails in a controlled way without moving anything', async () => {
  const controller = createHeightController({
    config: {
      ...fastConfig,
      controllerMode: 'hardware',
    },
  })

  await assert.rejects(controller.connect(), {
    code: 'HARDWARE_NOT_IMPLEMENTED',
  })
  assert.equal(controller.getStatus().error, 'HARDWARE_NOT_IMPLEMENTED')
})

test('localService mode is selected by config and reads connected status', async () => {
  const calls = []
  const restoreGlobals = installBrowserTestGlobals({
    fetchImpl: async (url) => {
      calls.push(url)
      return createJsonResponse({
        ok: true,
        status: connectedKnownStatus,
      })
    },
  })

  try {
    const controller = createHeightController({
      config: localServiceConfig,
    })

    await controller.connect()

    assert.equal(controller.mode, 'localService')
    assert.equal(controller.getStatus().connected, true)
    assert.equal(controller.getStatus().status, heightControllerStatuses.idle)
    assert.equal(controller.getStatus().currentPositionMm, 5)
    assert.equal(controller.getStatus().positionKnown, true)
    assert.ok(calls[0].endsWith('/health'))
    controller.destroy()
  } finally {
    restoreGlobals()
  }
})

test('localService reports unavailable service and timeout as normalized errors', async () => {
  const restoreUnavailable = installBrowserTestGlobals({
    fetchImpl: async () => {
      throw new TypeError('failed')
    },
  })

  try {
    const controller = createLocalServiceHeightController({
      config: localServiceConfig,
    })
    await assert.rejects(controller.connect(), {
      code: 'LOCAL_SERVICE_UNAVAILABLE',
    })
  } finally {
    restoreUnavailable()
  }

  const restoreTimeout = installBrowserTestGlobals({
    fetchImpl: (_url, { signal }) =>
      new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => {
          const error = new Error('aborted')
          error.name = 'AbortError'
          reject(error)
        })
      }),
  })

  try {
    const controller = createLocalServiceHeightController({
      config: localServiceConfig,
    })
    await assert.rejects(controller.connect(), {
      code: 'LOCAL_SERVICE_TIMEOUT',
    })
    controller.destroy()
  } finally {
    restoreTimeout()
  }
})

test('localService never runs automatic adjustment or navigation', async () => {
  const restoreGlobals = installBrowserTestGlobals({
    fetchImpl: async () =>
      createJsonResponse({
        ok: true,
        status: connectedKnownStatus,
      }),
  })

  try {
    let completed = false
    const controller = createLocalServiceHeightController({
      config: localServiceConfig,
    })
    const orchestrator = createHeightAdjustmentOrchestrator({
      controller,
      config: localServiceConfig,
    })

    await orchestrator.connect()
    await orchestrator.startAutomaticAdjustment()

    assert.equal(
      orchestrator.getStatus().status,
      heightControllerStatuses.idle,
    )
    assert.equal(
      shouldNavigateAfterHeightAdjustment(orchestrator.getStatus().status),
      false,
    )
    assert.equal(completed, false)
    orchestrator.destroy()
  } finally {
    restoreGlobals()
  }
})

test('localService refuses move before HOME and supports manual HOME, MOVE and STOP', async () => {
  const calls = []
  const restoreGlobals = installBrowserTestGlobals({
    fetchImpl: async (url, options = {}) => {
      calls.push({ url, method: options.method ?? 'GET', body: options.body })

      if (url.endsWith('/health')) {
        return createJsonResponse({
          ok: true,
          status: connectedUnknownStatus,
        })
      }

      if (url.endsWith('/motor/home')) {
        return createJsonResponse({
          ok: true,
          status: {
            ...connectedKnownStatus,
            motion: 'stopped',
            position_mm: 0,
          },
        })
      }

      if (url.endsWith('/motor/move-to')) {
        return createJsonResponse({
          ok: true,
          status: {
            ...connectedKnownStatus,
            motion: 'stopped',
            position_mm: 5,
          },
        })
      }

      if (url.endsWith('/motor/stop')) {
        return createJsonResponse({
          ok: true,
          status: {
            ...connectedKnownStatus,
            motion: 'stopped',
          },
        })
      }

      return createJsonResponse({ ok: true, status: connectedKnownStatus })
    },
  })

  try {
    const controller = createLocalServiceHeightController({
      config: localServiceConfig,
    })
    await controller.connect()

    await assert.rejects(controller.moveToMm(5), {
      code: 'POSITION_UNKNOWN',
    })
    assert.equal(
      calls.some((call) => call.url.endsWith('/motor/move-to')),
      false,
    )

    await controller.home()
    await controller.moveToMm(5)
    await controller.stop()

    assert.equal(controller.getStatus().currentPositionMm, 5)
    assert.equal(controller.getStatus().positionKnown, true)
    assert.ok(calls.some((call) => call.url.endsWith('/motor/home')))
    assert.ok(calls.some((call) => call.url.endsWith('/motor/move-to')))
    assert.ok(calls.some((call) => call.url.endsWith('/motor/stop')))
    controller.destroy()
  } finally {
    restoreGlobals()
  }
})

test('localService keeps STOP available in local error and aborts pending requests on destroy', async () => {
  let stopCalled = false
  const restoreGlobals = installBrowserTestGlobals({
    fetchImpl: async (url, options = {}) => {
      if (url.endsWith('/health')) {
        return createJsonResponse({
          ok: true,
          status: connectedKnownStatus,
        })
      }

      if (url.endsWith('/motor/move-to')) {
        return createJsonResponse({
          ok: false,
          error: {
            code: 'MOTOR_ERROR_ACTIVE',
            message: 'error',
          },
          status: {
            ...connectedKnownStatus,
            motion: 'error',
            last_error: {
              code: 'MOTOR_ERROR_ACTIVE',
              message: 'error',
            },
          },
        })
      }

      if (url.endsWith('/motor/stop')) {
        stopCalled = true
        return createJsonResponse({
          ok: true,
          status: {
            ...connectedKnownStatus,
            motion: 'stopped',
          },
        })
      }

      return new Promise((_resolve, reject) => {
        options.signal?.addEventListener('abort', () => {
          const error = new Error('aborted')
          error.name = 'AbortError'
          reject(error)
        })
      })
    },
  })

  try {
    const controller = createLocalServiceHeightController({
      config: localServiceConfig,
    })
    await controller.connect()
    await assert.rejects(controller.moveToMm(5), {
      code: 'MOTOR_ERROR_ACTIVE',
    })
    await controller.stop()
    assert.equal(stopCalled, true)

    const pendingRefresh = controller.refreshStatus()
    controller.destroy()
    await assert.rejects(pendingRefresh)
  } finally {
    restoreGlobals()
  }
})

test('the orchestrator alone owns measuring, settling, verifying and complete', async () => {
  const clock = createFakeClock()
  const controller = createSimulatedHeightController({
    config: fastConfig,
    clock,
  })
  const orchestrator = createHeightAdjustmentOrchestrator({
    controller,
    config: fastConfig,
    clock,
  })
  const statuses = []
  orchestrator.subscribe((state) => statuses.push(state.status))

  await orchestrator.connect()
  const automaticRun = orchestrator.startAutomaticAdjustment()

  assert.equal(
    orchestrator.getStatus().status,
    heightControllerStatuses.measuring,
  )

  clock.advance(fastConfig.measuringDurationMs)
  await flushPromises()
  assert.equal(
    orchestrator.getStatus().status,
    heightControllerStatuses.movingUp,
  )

  clock.advance(60)
  await flushPromises()
  assert.equal(
    orchestrator.getStatus().status,
    heightControllerStatuses.settling,
  )

  clock.advance(fastConfig.settlingDurationMs)
  await flushPromises()
  assert.equal(
    orchestrator.getStatus().status,
    heightControllerStatuses.verifying,
  )

  clock.advance(fastConfig.verificationDurationMs)
  await automaticRun

  assert.equal(
    orchestrator.getStatus().status,
    heightControllerStatuses.complete,
  )
  assert.equal(
    orchestrator.getStatus().currentPositionMm,
    fastConfig.simulationTargetPositionMm,
  )
  assert.deepEqual(
    statuses.filter((status, index) => status !== statuses[index - 1]),
    [
      heightControllerStatuses.disconnected,
      heightControllerStatuses.idle,
      heightControllerStatuses.measuring,
      heightControllerStatuses.movingUp,
      heightControllerStatuses.idle,
      heightControllerStatuses.settling,
      heightControllerStatuses.verifying,
      heightControllerStatuses.complete,
    ],
  )
})

test('stop or error cancels automatic completion and prevents navigation', async () => {
  const clock = createFakeClock()
  const controller = createSimulatedHeightController({
    config: fastConfig,
    clock,
  })
  const orchestrator = createHeightAdjustmentOrchestrator({
    controller,
    config: fastConfig,
    clock,
  })
  await orchestrator.connect()

  const automaticRun = orchestrator.startAutomaticAdjustment()
  const cancellation = assert.rejects(automaticRun, {
    code: 'MOVEMENT_STOPPED',
  })
  orchestrator.stop()
  await cancellation

  assert.equal(
    shouldNavigateAfterHeightAdjustment(
      orchestrator.getStatus().status,
    ),
    false,
  )

  orchestrator.simulateError()
  assert.equal(
    shouldNavigateAfterHeightAdjustment(
      orchestrator.getStatus().status,
    ),
    false,
  )
  assert.equal(
    shouldNavigateAfterHeightAdjustment(
      heightControllerStatuses.complete,
    ),
    true,
  )
})

test('reset restores the configured simulated initial position', async () => {
  const clock = createFakeClock()
  const controller = createSimulatedHeightController({
    config: fastConfig,
    clock,
  })
  await controller.connect()

  const movement = controller.moveToMm(300)
  clock.advance(60)
  await movement
  controller.reset()

  assert.equal(
    controller.getStatus().currentPositionMm,
    fastConfig.initialPositionMm,
  )
  assert.equal(controller.getStatus().targetPositionMm, null)
})

test('display routing keeps the legacy experience route while artwork selection is temporary', () => {
  assert.equal(
    getDisplayRouteForSessionStatus(
      SESSION_STATUSES.heightAdjustment,
    ),
    routes.displayHeightAdjustment,
  )
  assert.equal(
    getDisplayRouteForSessionStatus(
      SESSION_STATUSES.experienceActive,
    ),
    routes.displayArtworkSelection,
  )
  assert.equal(
    getDisplayRouteForSessionStatus(SESSION_STATUSES.generating),
    routes.displayExperience,
  )
  assert.equal(routes.displayExperience, '/display/experience')
})
