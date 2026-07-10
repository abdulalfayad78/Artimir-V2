import { heightControllerStatuses } from './heightControllerState.js'

function shouldNavigateAfterHeightAdjustment(status) {
  return status === heightControllerStatuses.complete
}

export { shouldNavigateAfterHeightAdjustment }
