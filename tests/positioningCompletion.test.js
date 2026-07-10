import assert from 'node:assert/strict'
import test from 'node:test'

import positioningConfig from '../frontend/src/config/positioningConfig.js'
import { getDisplayRouteForSessionStatus } from '../frontend/src/navigation/displaySessionRoutes.js'
import { routes } from '../frontend/src/navigation/hashNavigation.js'
import { createPositioningCompletionController } from '../frontend/src/positioning/createPositioningCompletionController.js'
import { SESSION_STATUSES } from '../shared/sessionProtocol.js'

function createFakeClock() {
  let currentTime = 0
  let nextId = 1
  const tasks = new Map()

  const advance = (durationMs) => {
    const target = currentTime + durationMs

    while (true) {
      let nextIdToRun = null
      let nextTask = null

      for (const [id, task] of tasks) {
        if (task.runAt <= target && (!nextTask || task.runAt < nextTask.runAt)) {
          nextIdToRun = id
          nextTask = task
        }
      }

      if (!nextTask) {
        break
      }

      currentTime = nextTask.runAt
      tasks.delete(nextIdToRun)
      nextTask.callback()
    }

    currentTime = target
  }

  return {
    advance,
    clearTimeout: (id) => tasks.delete(id),
    now: () => currentTime,
    pendingCount: () => tasks.size,
    setTimeout: (callback, delay) => {
      const id = nextId
      nextId += 1
      tasks.set(id, {
        callback,
        runAt: currentTime + delay,
      })
      return id
    },
  }
}

async function flushPromises() {
  await Promise.resolve()
  await Promise.resolve()
}

function createController({
  completionDelayMs = 100,
  onComplete = async () => {},
  shutdown = () => {},
} = {}) {
  const clock = createFakeClock()
  const controller = createPositioningCompletionController({
    clock,
    completionDelayMs,
    onComplete,
    shutdown,
  })

  return { clock, controller }
}

test('stable position_correct triggers completion after the configured delay', async () => {
  let callbackCalls = 0
  let shutdownCalls = 0
  const { clock, controller } = createController({
    onComplete: async () => {
      callbackCalls += 1
    },
    shutdown: () => {
      shutdownCalls += 1
    },
  })

  controller.evaluate({ positionCorrect: true })
  assert.equal(controller.getState().completionLatched, true)
  assert.equal(shutdownCalls, 1)
  assert.equal(callbackCalls, 0)

  clock.advance(100)
  await flushPromises()

  assert.equal(callbackCalls, 1)
  assert.equal(controller.getState().completionCallbackCalled, true)
  assert.equal(controller.getState().socketEventSent, true)
})

test('invalid frame before completion does not clear an already acquired latch', async () => {
  let callbackCalls = 0
  const { clock, controller } = createController({
    onComplete: async () => {
      callbackCalls += 1
    },
  })

  controller.evaluate({ positionCorrect: true })
  controller.evaluate({ positionCorrect: false })
  clock.advance(100)
  await flushPromises()

  assert.equal(callbackCalls, 1)
})

test('invalid frame before position_correct does not start the timer, and recovery can complete later', async () => {
  let callbackCalls = 0
  const { clock, controller } = createController({
    onComplete: async () => {
      callbackCalls += 1
    },
  })

  controller.evaluate({ positionCorrect: false })
  clock.advance(500)
  await flushPromises()
  assert.equal(callbackCalls, 0)

  controller.evaluate({ positionCorrect: true })
  clock.advance(100)
  await flushPromises()
  assert.equal(callbackCalls, 1)
})

test('StrictMode style double effect sends one completion callback', async () => {
  let callbackCalls = 0
  const { clock, controller } = createController({
    onComplete: async () => {
      callbackCalls += 1
    },
  })

  controller.evaluate({ positionCorrect: true })
  controller.evaluate({ positionCorrect: true })
  controller.trigger()

  clock.advance(100)
  await flushPromises()

  assert.equal(callbackCalls, 1)
  assert.equal(controller.getState().completionCallbackCalled, true)
})

test('destroy cleans up a pending completion timer', async () => {
  let callbackCalls = 0
  const { clock, controller } = createController({
    onComplete: async () => {
      callbackCalls += 1
    },
  })

  controller.evaluate({ positionCorrect: true })
  assert.equal(clock.pendingCount(), 1)
  controller.destroy()
  clock.advance(100)
  await flushPromises()

  assert.equal(callbackCalls, 0)
  assert.equal(clock.pendingCount(), 0)
})

test('POSITIONING_COMPLETED routes the display to height-adjustment', () => {
  assert.equal(
    getDisplayRouteForSessionStatus(
      SESSION_STATUSES.positioningCompleted,
    ),
    routes.displayHeightAdjustment,
  )
  assert.equal(positioningConfig.filtering.stableDurationMs, 1200)
})
