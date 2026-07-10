import { SESSION_STATUSES } from '../../../shared/sessionProtocol.js'
import { routes } from './hashNavigation.js'

const routeByStatus = Object.freeze({
  [SESSION_STATUSES.waitingForPhone]: routes.displayWaiting,
  [SESSION_STATUSES.phoneConnected]: routes.displayWaiting,
  [SESSION_STATUSES.languageSelected]: routes.displayWaiting,
  [SESSION_STATUSES.profileInProgress]: routes.displayWaiting,
  [SESSION_STATUSES.profileCompleted]: routes.displayWaiting,
  [SESSION_STATUSES.customizationInProgress]:
    routes.displayWaiting,
  [SESSION_STATUSES.customizationCompleted]:
    routes.displayWaiting,
  [SESSION_STATUSES.startPositioning]:
    routes.displayPositioning,
  [SESSION_STATUSES.positioningActive]:
    routes.displayPositioning,
  [SESSION_STATUSES.positioningCompleted]:
    routes.displayHeightAdjustment,
  [SESSION_STATUSES.heightAdjustment]:
    routes.displayHeightAdjustment,
  /*
   * Temporary V2 routing: EXPERIENCE_ACTIVE currently enters the first
   * experience sub-step. Keep /display/experience available so future
   * sub-steps (presentation, discussion, mapping and photo) can receive
   * their own routes without changing the session bootstrap.
   */
  [SESSION_STATUSES.experienceActive]:
    routes.displayArtworkSelection,
  [SESSION_STATUSES.generating]: routes.displayExperience,
  [SESSION_STATUSES.resultReady]: routes.displayResult,
})

function getDisplayRouteForSessionStatus(status) {
  return routeByStatus[status] ?? null
}

export { getDisplayRouteForSessionStatus, routeByStatus }
