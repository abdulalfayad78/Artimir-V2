import {
  CLIENT_ROLES,
  SESSION_STATUSES,
} from '../../../shared/sessionProtocol.js'
import { routes } from '../navigation/hashNavigation.js'

function canUseDisplayCamera({
  remoteSession,
  role,
  routePath,
  sessionId,
}) {
  return Boolean(
    role === CLIENT_ROLES.display &&
      routePath === routes.displayPositioning &&
      sessionId &&
      remoteSession?.id === sessionId &&
      remoteSession.status === SESSION_STATUSES.positioningActive,
  )
}

export { canUseDisplayCamera }
