const storageKeys = Object.freeze({
  role: 'artimir.clientRole',
  sessionId: 'artimir.sessionId',
  phoneClientId: 'artimir.phoneClientId',
  displayClientId: 'artimir.displayClientId',
  experience: 'artimir.experience',
})

const memoryStorage = new Map()
const cookieFallbackKeys = new Set([
  storageKeys.role,
  storageKeys.sessionId,
  storageKeys.phoneClientId,
  storageKeys.displayClientId,
])

function readCookie(key) {
  if (typeof document === 'undefined') {
    return null
  }

  try {
    const prefix = `${encodeURIComponent(key)}=`
    const entry = document.cookie
      .split('; ')
      .find((value) => value.startsWith(prefix))

    return entry
      ? decodeURIComponent(entry.slice(prefix.length))
      : null
  } catch {
    return null
  }
}

function writeCookie(key, value) {
  if (
    typeof document === 'undefined' ||
    !cookieFallbackKeys.has(key)
  ) {
    return
  }

  try {
    const encodedKey = encodeURIComponent(key)

    if (value === null || value === undefined) {
      document.cookie = `${encodedKey}=; Max-Age=0; Path=/; SameSite=Lax`
      return
    }

    document.cookie = `${encodedKey}=${encodeURIComponent(
      value,
    )}; Max-Age=86400; Path=/; SameSite=Lax`
  } catch {
    // The in-memory fallback still covers the current page lifecycle.
  }
}

function readStorage(key) {
  if (memoryStorage.has(key)) {
    return memoryStorage.get(key)
  }

  let value = null

  try {
    value = localStorage.getItem(key)
  } catch {
    // Safari may temporarily block localStorage.
  }

  if (value === null) {
    try {
      value = sessionStorage.getItem(key)
    } catch {
      // Continue with the cookie fallback.
    }
  }

  if (value === null && cookieFallbackKeys.has(key)) {
    value = readCookie(key)
  }

  if (value !== null) {
    memoryStorage.set(key, value)
  }

  return value
}

function writeStorage(key, value) {
  if (value === null || value === undefined) {
    memoryStorage.delete(key)
  } else {
    memoryStorage.set(key, value)
  }

  try {
    if (value === null || value === undefined) {
      localStorage.removeItem(key)
    } else {
      localStorage.setItem(key, value)
    }
  } catch {
    // Continue with sessionStorage and cookie fallbacks.
  }

  try {
    if (value === null || value === undefined) {
      sessionStorage.removeItem(key)
    } else {
      sessionStorage.setItem(key, value)
    }
  } catch {
    // The in-memory fallback still keeps the current page stable.
  }

  writeCookie(key, value)
}

function createClientId(prefix) {
  const randomPart =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2)}`

  return `${prefix}-${randomPart}`
}

function getOrCreateClientId(role) {
  const key =
    role === 'display'
      ? storageKeys.displayClientId
      : storageKeys.phoneClientId
  const existingId = readStorage(key)

  if (existingId) {
    return existingId
  }

  const clientId = createClientId(role)
  writeStorage(key, clientId)
  return clientId
}

function storeClientSession(role, sessionId) {
  writeStorage(storageKeys.role, role)
  writeStorage(storageKeys.sessionId, sessionId)
}

function clearClientSession({ clearExperience = false } = {}) {
  writeStorage(storageKeys.role, null)
  writeStorage(storageKeys.sessionId, null)

  if (clearExperience) {
    writeStorage(storageKeys.experience, null)
  }
}

export {
  clearClientSession,
  getOrCreateClientId,
  readStorage,
  storageKeys,
  storeClientSession,
  writeStorage,
}
