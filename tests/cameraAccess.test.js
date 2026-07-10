import assert from 'node:assert/strict'
import test from 'node:test'
import {
  CLIENT_ROLES,
  SESSION_STATUSES,
} from '../shared/sessionProtocol.js'
import { routes } from '../frontend/src/navigation/hashNavigation.js'
import {
  canUseDisplayCamera,
} from '../frontend/src/security/cameraAccess.js'

const validSession = {
  id: 'A7K4P2',
  status: SESSION_STATUSES.positioningActive,
}

test('camera access requires display role, display route and matching session', () => {
  assert.equal(
    canUseDisplayCamera({
      remoteSession: validSession,
      role: CLIENT_ROLES.display,
      routePath: routes.displayPositioning,
      sessionId: validSession.id,
    }),
    true,
  )

  for (const invalidInput of [
    { role: CLIENT_ROLES.phone },
    { routePath: routes.legacyPositioning },
    { sessionId: 'OTHER1' },
    {
      remoteSession: {
        ...validSession,
        status: SESSION_STATUSES.startPositioning,
      },
    },
  ]) {
    assert.equal(
      canUseDisplayCamera({
        remoteSession: validSession,
        role: CLIENT_ROLES.display,
        routePath: routes.displayPositioning,
        sessionId: validSession.id,
        ...invalidInput,
      }),
      false,
    )
  }
})
