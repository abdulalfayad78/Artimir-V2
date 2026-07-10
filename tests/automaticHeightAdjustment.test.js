import assert from 'node:assert/strict'
import test from 'node:test'

import heightAdjustmentConfig from '../frontend/src/config/heightAdjustmentConfig.js'
import { heightRecommendations } from '../frontend/src/detection/heightObservation.js'
import {
  automaticHeightStates,
  createAutomaticHeightAdjustmentMachine,
  getArmDiagnostics,
} from '../frontend/src/height/createAutomaticHeightAdjustmentMachine.js'
import { heightControllerStatuses } from '../frontend/src/height/heightControllerState.js'

function createFakeClock() {
  let currentTime = 0
  let nextId = 1
  const tasks = new Map()

  const advance = (durationMs) => {
    const target = currentTime + durationMs

    while (true) {
      let selectedId = null
      let selectedTask = null

      for (const [id, task] of tasks) {
        if (task.runAt <= target && (!selectedTask || task.runAt < selectedTask.runAt)) {
          selectedId = id
          selectedTask = task
        }
      }

      if (!selectedTask) {
        break
      }

      currentTime = selectedTask.runAt
      tasks.delete(selectedId)
      selectedTask.callback()
    }

    currentTime = target
  }

  return {
    advance,
    clearTimeout: (id) => tasks.delete(id),
    now: () => currentTime,
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

const enabledConfig = Object.freeze({
  ...heightAdjustmentConfig,
  automaticHeightAdjustmentEnabled: true,
  automaticHeightCooldownMs: 100,
  automaticHeightMaximumMovesPerCycle: 1,
  automaticHeightMinimumSamples: 10,
  automaticHeightStableDurationMs: 1000,
  controllerMode: 'localService',
  maxPositionMm: 500,
  minPositionMm: 0,
})

const disabledConfig = Object.freeze({
  ...enabledConfig,
  automaticHeightAdjustmentEnabled: false,
})

function makeControllerState(overrides = {}) {
  return {
    connected: true,
    currentPositionMm: 50,
    error: null,
    lastError: null,
    mode: 'localService',
    positionKnown: true,
    status: heightControllerStatuses.idle,
    ...overrides,
  }
}

function makeObservation({
  recommendation = heightRecommendations.artimirShouldMoveUp,
  now = 0,
  stableSampleCount = 10,
  ...overrides
} = {}) {
  return {
    dataAgeMs: 20,
    displayedHeightRecommendation: recommendation,
    eyeCenterMethod: 'eye_contour',
    faceValid: true,
    reason: null,
    stable: true,
    stableSampleCount,
    updatedAt: now,
    ...overrides,
  }
}

async function flushPromises() {
  await Promise.resolve()
  await Promise.resolve()
}

function createMachine({
  config = enabledConfig,
  moveToMm = async () => {},
  stop = async () => {},
} = {}) {
  const clock = createFakeClock()
  const machine = createAutomaticHeightAdjustmentMachine({
    clock,
    config,
    moveToMm,
    stop,
  })

  return { clock, machine }
}

function armAndFeedStable({ clock, machine }, controllerState, recommendation) {
  machine.arm(controllerState)
  machine.evaluate({
    controllerState,
    observation: makeObservation({
      now: clock.now(),
      recommendation,
    }),
    now: clock.now(),
  })
  clock.advance(1000)
  machine.evaluate({
    controllerState,
    observation: makeObservation({
      now: clock.now(),
      recommendation,
    }),
    now: clock.now(),
  })
}

test('automatic height adjustment is disabled by default and never moves', () => {
  let moveCalls = 0
  const setup = createMachine({
    config: disabledConfig,
    moveToMm: async () => {
      moveCalls += 1
    },
  })

  armAndFeedStable(
    setup,
    makeControllerState(),
    heightRecommendations.artimirShouldMoveUp,
  )

  assert.equal(moveCalls, 0)
  assert.equal(
    setup.machine.getSnapshot().automaticState,
    automaticHeightStates.disabled,
  )
})

test('enabled automation stays unarmed until the debug arm action is called', () => {
  let moveCalls = 0
  const { clock, machine } = createMachine({
    moveToMm: async () => {
      moveCalls += 1
    },
  })
  const controllerState = makeControllerState()

  clock.advance(5000)
  machine.evaluate({
    controllerState,
    observation: makeObservation({ now: clock.now() }),
    now: clock.now(),
  })

  assert.equal(moveCalls, 0)
  assert.equal(
    machine.getSnapshot().automaticState,
    automaticHeightStates.observingUnarmed,
  )
})

test('observing_unarmed with idle motor and known position can be armed', () => {
  const { machine } = createMachine()
  const controllerState = makeControllerState({
    status: heightControllerStatuses.idle,
  })

  machine.evaluate({
    controllerState,
    observation: makeObservation({
      recommendation: heightRecommendations.heightCorrect,
    }),
    now: 0,
  })

  const diagnostics = machine.getSnapshot().armDiagnostics

  assert.equal(
    machine.getSnapshot().automaticState,
    automaticHeightStates.observingUnarmed,
  )
  assert.equal(diagnostics.canArm, true)
  assert.equal(diagnostics.controllerStatusAllowed, true)
  assert.equal(diagnostics.armBlockedReason, null)
})

test('Python motion ready normalized to frontend idle can be armed', () => {
  const diagnostics = getArmDiagnostics({
    automaticState: automaticHeightStates.observingUnarmed,
    config: enabledConfig,
    controllerState: makeControllerState({
      status: heightControllerStatuses.idle,
    }),
    moveCount: 0,
    movementReserved: false,
  })

  assert.equal(diagnostics.controllerStatus, heightControllerStatuses.idle)
  assert.equal(diagnostics.canArm, true)
})

test('missing movement recommendation does not disable the Arm button', () => {
  let moveCalls = 0
  const { clock, machine } = createMachine({
    moveToMm: async () => {
      moveCalls += 1
    },
  })
  const controllerState = makeControllerState()

  machine.evaluate({
    controllerState,
    observation: makeObservation({
      recommendation: heightRecommendations.heightCorrect,
      now: clock.now(),
    }),
    now: clock.now(),
  })
  assert.equal(machine.getSnapshot().armDiagnostics.canArm, true)

  machine.arm(controllerState)
  assert.equal(
    machine.getSnapshot().automaticState,
    automaticHeightStates.observing,
  )
  clock.advance(2000)
  machine.evaluate({
    controllerState,
    observation: makeObservation({
      recommendation: heightRecommendations.heightCorrect,
      now: clock.now(),
    }),
    now: clock.now(),
  })

  assert.equal(moveCalls, 0)
})

test('unknown position, disconnected service, errors and consumed cycle disable Arm', () => {
  const cases = [
    [makeControllerState({ positionKnown: false }), 'positionKnown'],
    [makeControllerState({ connected: false }), 'connected'],
    [makeControllerState({ error: 'MOTOR_ERROR_ACTIVE' }), 'noControllerError'],
  ]

  for (const [controllerState, reason] of cases) {
    const diagnostics = getArmDiagnostics({
      automaticState: automaticHeightStates.observingUnarmed,
      config: enabledConfig,
      controllerState,
      moveCount: 0,
      movementReserved: false,
    })

    assert.equal(diagnostics.canArm, false)
    assert.equal(diagnostics.armBlockedReason, reason)
  }

  const consumed = getArmDiagnostics({
    automaticState: automaticHeightStates.completedOnce,
    config: enabledConfig,
    controllerState: makeControllerState(),
    moveCount: 1,
    movementReserved: false,
  })

  assert.equal(consumed.canArm, false)
  assert.equal(consumed.moveCountBelowLimit, false)
})

test('Rearm is unavailable before the first cycle and double Arm does not create two cycles', () => {
  let moveCalls = 0
  const { clock, machine } = createMachine({
    moveToMm: async () => {
      moveCalls += 1
    },
  })
  const controllerState = makeControllerState()

  machine.rearm(controllerState)
  assert.equal(
    machine.getSnapshot().automaticState,
    automaticHeightStates.observingUnarmed,
  )
  assert.equal(machine.getSnapshot().blockedReason, 'rearm_not_available')

  machine.arm(controllerState)
  machine.arm(controllerState)
  clock.advance(1000)
  machine.evaluate({
    controllerState,
    observation: makeObservation({ now: clock.now() }),
    now: clock.now(),
  })

  assert.equal(moveCalls, 0)
  assert.equal(machine.getSnapshot().moveCount, 0)
})

test('unstable recommendation never moves after manual arm', () => {
  let moveCalls = 0
  const { clock, machine } = createMachine({
    moveToMm: async () => {
      moveCalls += 1
    },
  })
  const controllerState = makeControllerState()

  machine.arm(controllerState)
  clock.advance(1500)
  machine.evaluate({
    controllerState,
    observation: makeObservation({
      now: clock.now(),
      stable: false,
    }),
    now: clock.now(),
  })

  assert.equal(moveCalls, 0)
})

test('stable move-up recommendation sends exactly one absolute +5 mm target', () => {
  const calls = []
  const setup = createMachine({
    moveToMm: async (targetMm) => {
      calls.push(targetMm)
    },
  })

  armAndFeedStable(
    setup,
    makeControllerState({ currentPositionMm: 50 }),
    heightRecommendations.artimirShouldMoveUp,
  )

  assert.deepEqual(calls, [55])
  assert.equal(setup.machine.getSnapshot().moveCount, 1)
})

test('stable move-down recommendation sends exactly one absolute -5 mm target', () => {
  const calls = []
  const setup = createMachine({
    moveToMm: async (targetMm) => {
      calls.push(targetMm)
    },
  })

  armAndFeedStable(
    setup,
    makeControllerState({ currentPositionMm: 50 }),
    heightRecommendations.artimirShouldMoveDown,
  )

  assert.deepEqual(calls, [45])
})

test('lower and upper limits block automatic movement', () => {
  for (const [position, recommendation, reason] of [
    [0, heightRecommendations.artimirShouldMoveDown, 'lower_limit_reached'],
    [500, heightRecommendations.artimirShouldMoveUp, 'upper_limit_reached'],
  ]) {
    const calls = []
    const setup = createMachine({
      moveToMm: async (targetMm) => calls.push(targetMm),
    })

    armAndFeedStable(
      setup,
      makeControllerState({ currentPositionMm: position }),
      recommendation,
    )

    assert.deepEqual(calls, [])
    assert.equal(setup.machine.getSnapshot().blockedReason, reason)
  }
})

test('connection, position, moving and error guards block automatic movement', () => {
  const blockedStates = [
    makeControllerState({ connected: false, status: heightControllerStatuses.disconnected }),
    makeControllerState({ positionKnown: false }),
    makeControllerState({ status: heightControllerStatuses.movingUp }),
    makeControllerState({ status: heightControllerStatuses.homing }),
    makeControllerState({ error: 'MOTOR_ERROR_ACTIVE' }),
  ]

  for (const controllerState of blockedStates) {
    let moveCalls = 0
    const setup = createMachine({
      moveToMm: async () => {
        moveCalls += 1
      },
    })

    armAndFeedStable(
      setup,
      controllerState,
      heightRecommendations.artimirShouldMoveUp,
    )

    assert.equal(moveCalls, 0)
  }
})

test('stale data or face loss before command cancels the planned movement', () => {
  for (const observation of [
    makeObservation({ dataAgeMs: 250, now: 0 }),
    makeObservation({ faceValid: false, now: 0 }),
  ]) {
    let moveCalls = 0
    const { clock, machine } = createMachine({
      moveToMm: async () => {
        moveCalls += 1
      },
    })
    const controllerState = makeControllerState()

    machine.arm(controllerState)
    clock.advance(1500)
    machine.evaluate({
      controllerState,
      observation: { ...observation, updatedAt: clock.now() },
      now: clock.now(),
    })

    assert.equal(moveCalls, 0)
  }
})

test('double evaluation under rerender or StrictMode reserves the move before calling moveToMm', () => {
  const calls = []
  const setup = createMachine({
    moveToMm: async (targetMm) => {
      calls.push(targetMm)
    },
  })
  const controllerState = makeControllerState()

  setup.machine.arm(controllerState)
  setup.machine.evaluate({
    controllerState,
    observation: makeObservation({ now: 0 }),
    now: 0,
  })
  setup.clock.advance(1000)
  const observation = makeObservation({ now: setup.clock.now() })
  setup.machine.evaluate({
    controllerState,
    observation,
    now: setup.clock.now(),
  })
  setup.machine.evaluate({
    controllerState,
    observation,
    now: setup.clock.now(),
  })

  assert.deepEqual(calls, [55])
})

test('move resolution confirms EVENT:ARRIVED, waits cooldown, remeasures with new samples and never sends a second move', async () => {
  const calls = []
  const setup = createMachine({
    moveToMm: async (targetMm) => {
      calls.push(targetMm)
    },
  })
  const controllerState = makeControllerState()

  armAndFeedStable(
    setup,
    controllerState,
    heightRecommendations.artimirShouldMoveUp,
  )
  await flushPromises()

  assert.equal(
    setup.machine.getSnapshot().automaticState,
    automaticHeightStates.waitingForSettle,
  )

  setup.clock.advance(enabledConfig.automaticHeightCooldownMs)

  for (let index = 0; index < enabledConfig.automaticHeightMinimumSamples; index += 1) {
    setup.clock.advance(50)
    setup.machine.evaluate({
      controllerState,
      observation: makeObservation({
        now: setup.clock.now(),
        recommendation: heightRecommendations.heightCorrect,
      }),
      now: setup.clock.now(),
    })
  }

  assert.equal(
    setup.machine.getSnapshot().automaticState,
    automaticHeightStates.completedOnce,
  )

  setup.clock.advance(3000)
  setup.machine.evaluate({
    controllerState,
    observation: makeObservation({
      now: setup.clock.now(),
      recommendation: heightRecommendations.artimirShouldMoveDown,
    }),
    now: setup.clock.now(),
  })

  assert.deepEqual(calls, [55])
})

test('face loss during movement calls STOP once and late move resolution is ignored', async () => {
  let resolveMove
  let stopCalls = 0
  const setup = createMachine({
    moveToMm: () => new Promise((resolve) => {
      resolveMove = resolve
    }),
    stop: async () => {
      stopCalls += 1
    },
  })
  const controllerState = makeControllerState()

  armAndFeedStable(
    setup,
    controllerState,
    heightRecommendations.artimirShouldMoveUp,
  )

  setup.machine.evaluate({
    controllerState: makeControllerState({ status: heightControllerStatuses.movingUp }),
    observation: makeObservation({
      faceValid: false,
      now: setup.clock.now(),
    }),
    now: setup.clock.now(),
  })
  resolveMove()
  await flushPromises()

  assert.equal(stopCalls, 1)
  assert.equal(
    setup.machine.getSnapshot().automaticState,
    automaticHeightStates.blocked,
  )
})

test('manual rearm allows one new cycle after completed_once', async () => {
  const calls = []
  const setup = createMachine({
    moveToMm: async (targetMm) => {
      calls.push(targetMm)
    },
  })
  const controllerState = makeControllerState()

  armAndFeedStable(
    setup,
    controllerState,
    heightRecommendations.artimirShouldMoveUp,
  )
  await flushPromises()
  setup.clock.advance(enabledConfig.automaticHeightCooldownMs)

  for (let index = 0; index < enabledConfig.automaticHeightMinimumSamples; index += 1) {
    setup.clock.advance(50)
    setup.machine.evaluate({
      controllerState,
      observation: makeObservation({ now: setup.clock.now() }),
      now: setup.clock.now(),
    })
  }

  setup.machine.rearm(controllerState)
  armAndFeedStable(
    setup,
    makeControllerState({ currentPositionMm: 55 }),
    heightRecommendations.artimirShouldMoveDown,
  )

  assert.deepEqual(calls, [55, 50])
})

test('cleanup during automatic movement sends STOP and no HOME or navigation is triggered by the machine', () => {
  let stopCalls = 0
  const setup = createMachine({
    moveToMm: () => new Promise(() => {}),
    stop: async () => {
      stopCalls += 1
    },
  })

  armAndFeedStable(
    setup,
    makeControllerState(),
    heightRecommendations.artimirShouldMoveUp,
  )
  setup.machine.destroy()

  assert.equal(stopCalls, 1)
})

test('simulation mode remains blocked even when automatic feature is enabled', () => {
  let moveCalls = 0
  const setup = createMachine({
    moveToMm: async () => {
      moveCalls += 1
    },
  })

  armAndFeedStable(
    setup,
    makeControllerState({ mode: 'simulation' }),
    heightRecommendations.artimirShouldMoveUp,
  )

  assert.equal(moveCalls, 0)
  assert.equal(
    setup.machine.getSnapshot().armDiagnostics.armBlockedReason,
    'controllerModeIsLocalService',
  )
})
