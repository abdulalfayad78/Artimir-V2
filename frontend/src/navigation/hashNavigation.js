const routes = Object.freeze({
  phoneLanguages: '/phone/languages',
  phoneProfile: '/phone/profile',
  phoneCustomization: '/phone/customization',
  phoneLookAtArtimir: '/phone/look-at-artimir',
  phoneSessionExpired: '/phone/session-expired',
  phoneSessionComplete: '/phone/session-complete',
  displayRoot: '/display',
  displayWaiting: '/display/waiting',
  displayPositioning: '/display/positioning',
  displayHeightAdjustment: '/display/height-adjustment',
  displayArtworkSelection: '/display/artwork-selection',
  displayExperience: '/display/experience',
  displayResult: '/display/result',
  legacyPositioning: '/positioning',
})

function readHashLocation() {
  const rawHash = window.location.hash.replace(/^#/, '') || routes.displayRoot
  const [path, queryString = ''] = rawHash.split('?')

  return {
    path: path.startsWith('/') ? path : `/${path}`,
    params: new URLSearchParams(queryString),
  }
}

function getSessionIdFromLocation() {
  const hashSessionId = readHashLocation().params.get('session')

  if (hashSessionId) {
    return hashSessionId.trim().toUpperCase()
  }

  return new URLSearchParams(window.location.search)
    .get('session')
    ?.trim()
    .toUpperCase() ?? null
}

function createHashUrl(path, sessionId) {
  const query = sessionId
    ? `?session=${encodeURIComponent(sessionId)}`
    : ''
  return `#${path}${query}`
}

function navigateHash(path, { sessionId, replace = false } = {}) {
  const nextHash = createHashUrl(path, sessionId)

  if (window.location.hash === nextHash) {
    return
  }

  if (replace) {
    window.history.replaceState(null, '', nextHash)
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  } else {
    window.location.hash = nextHash
  }
}

export {
  createHashUrl,
  getSessionIdFromLocation,
  navigateHash,
  readHashLocation,
  routes,
}
