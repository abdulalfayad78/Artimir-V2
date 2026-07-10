const CLIENT_ROLES = Object.freeze({
  phone: 'phone',
  display: 'display',
})

const SESSION_STATUSES = Object.freeze({
  waitingForPhone: 'WAITING_FOR_PHONE',
  phoneConnected: 'PHONE_CONNECTED',
  languageSelected: 'LANGUAGE_SELECTED',
  profileInProgress: 'PROFILE_IN_PROGRESS',
  profileCompleted: 'PROFILE_COMPLETED',
  customizationInProgress: 'CUSTOMIZATION_IN_PROGRESS',
  customizationCompleted: 'CUSTOMIZATION_COMPLETED',
  startPositioning: 'START_POSITIONING',
  positioningActive: 'POSITIONING_ACTIVE',
  positioningCompleted: 'POSITIONING_COMPLETED',
  heightAdjustment: 'HEIGHT_ADJUSTMENT',
  experienceActive: 'EXPERIENCE_ACTIVE',
  generating: 'GENERATING',
  resultReady: 'RESULT_READY',
  sessionCompleted: 'SESSION_COMPLETED',
  sessionExpired: 'SESSION_EXPIRED',
  error: 'ERROR',
})

const SOCKET_EVENTS = Object.freeze({
  sessionCreate: 'session:create',
  sessionCreated: 'session:created',
  sessionJoin: 'session:join',
  sessionJoined: 'session:joined',
  sessionState: 'session:state',
  sessionError: 'session:error',
  sessionReset: 'session:reset',
  sessionComplete: 'session:complete',
  phoneConnected: 'phone:connected',
  phoneLanguageSelected: 'phone:language-selected',
  phoneProfileUpdated: 'phone:profile-updated',
  phoneCustomizationUpdated: 'phone:customization-updated',
  phoneStartPositioning: 'phone:start-positioning',
  phoneCancel: 'phone:cancel',
  displayReady: 'display:ready',
  displayPositioningStarted: 'display:positioning-started',
  displayPositioningCompleted: 'display:positioning-completed',
  displayHeightAdjustmentStarted: 'display:height-adjustment-started',
  displayExperienceStarted: 'display:experience-started',
  displayResultReady: 'display:result-ready',
  displayError: 'display:error',
  mappingState: 'mapping:state',
})

const terminalStatuses = new Set([
  SESSION_STATUSES.sessionCompleted,
  SESSION_STATUSES.sessionExpired,
])

const setupStatuses = new Set([
  SESSION_STATUSES.phoneConnected,
  SESSION_STATUSES.languageSelected,
  SESSION_STATUSES.profileInProgress,
  SESSION_STATUSES.profileCompleted,
  SESSION_STATUSES.customizationInProgress,
  SESSION_STATUSES.customizationCompleted,
])

const allowedTransitions = {
  [SESSION_STATUSES.waitingForPhone]: new Set([
    SESSION_STATUSES.phoneConnected,
  ]),
  [SESSION_STATUSES.phoneConnected]: setupStatuses,
  [SESSION_STATUSES.languageSelected]: setupStatuses,
  [SESSION_STATUSES.profileInProgress]: setupStatuses,
  [SESSION_STATUSES.profileCompleted]: setupStatuses,
  [SESSION_STATUSES.customizationInProgress]: setupStatuses,
  [SESSION_STATUSES.customizationCompleted]: new Set([
    ...setupStatuses,
    SESSION_STATUSES.startPositioning,
  ]),
  [SESSION_STATUSES.startPositioning]: new Set([
    SESSION_STATUSES.positioningActive,
  ]),
  [SESSION_STATUSES.positioningActive]: new Set([
    SESSION_STATUSES.positioningCompleted,
  ]),
  [SESSION_STATUSES.positioningCompleted]: new Set([
    SESSION_STATUSES.heightAdjustment,
  ]),
  [SESSION_STATUSES.heightAdjustment]: new Set([
    SESSION_STATUSES.experienceActive,
  ]),
  [SESSION_STATUSES.experienceActive]: new Set([
    SESSION_STATUSES.generating,
    SESSION_STATUSES.resultReady,
  ]),
  [SESSION_STATUSES.generating]: new Set([
    SESSION_STATUSES.resultReady,
  ]),
  [SESSION_STATUSES.resultReady]: new Set([
    SESSION_STATUSES.sessionCompleted,
  ]),
  [SESSION_STATUSES.error]: new Set([
    SESSION_STATUSES.sessionCompleted,
  ]),
}

function canTransitionSession(currentStatus, nextStatus) {
  if (currentStatus === nextStatus) {
    return true
  }

  if (
    nextStatus === SESSION_STATUSES.error ||
    nextStatus === SESSION_STATUSES.sessionExpired ||
    nextStatus === SESSION_STATUSES.sessionCompleted
  ) {
    return !terminalStatuses.has(currentStatus)
  }

  return allowedTransitions[currentStatus]?.has(nextStatus) ?? false
}

function createEventEnvelope(sessionId, payload = {}) {
  return {
    sessionId: sessionId ?? null,
    payload,
  }
}

export {
  CLIENT_ROLES,
  SESSION_STATUSES,
  SOCKET_EVENTS,
  canTransitionSession,
  createEventEnvelope,
}
