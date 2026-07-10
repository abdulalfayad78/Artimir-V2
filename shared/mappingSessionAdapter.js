import {
  SESSION_STATUSES,
  createEventEnvelope,
} from './sessionProtocol.js'

const mappingRelevantStatuses = new Set([
  SESSION_STATUSES.positioningActive,
  SESSION_STATUSES.heightAdjustment,
  SESSION_STATUSES.experienceActive,
  SESSION_STATUSES.generating,
  SESSION_STATUSES.resultReady,
  SESSION_STATUSES.sessionCompleted,
])

function toMappingSessionState(session) {
  if (!session || !mappingRelevantStatuses.has(session.status)) {
    return null
  }

  return createEventEnvelope(session.id, {
    status: session.status,
    activeScene: session.activeScene,
  })
}

export { mappingRelevantStatuses, toMappingSessionState }
