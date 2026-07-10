const defaultSocketPort = 3001
const defaultMotorServiceUrl = 'http://127.0.0.1:8000'

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, '')
}

function normalizeRuntimeOrigin(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    return null
  }

  return trimTrailingSlash(value.trim())
}

function isPrivateIPv4(hostname) {
  const parts = hostname.split('.').map((part) => Number.parseInt(part, 10))

  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return false
  }

  return (
    parts[0] === 10 ||
    parts[0] === 127 ||
    (parts[0] === 192 && parts[1] === 168) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
  )
}

function normalizePublicPhoneOrigin(value) {
  const origin = normalizeRuntimeOrigin(value)

  if (!origin) {
    return null
  }

  try {
    const url = new URL(origin)
    const hostname = url.hostname.toLowerCase()
    const isLocalHostname =
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname === '0.0.0.0'

    if (
      url.protocol !== 'https:' ||
      isLocalHostname ||
      isPrivateIPv4(hostname)
    ) {
      return null
    }

    return url.origin
  } catch {
    return null
  }
}

function getLocalSocketUrl(location = window.location) {
  const protocol = location.protocol === 'https:' ? 'https:' : 'http:'
  return `${protocol}//${location.hostname}:${defaultSocketPort}`
}

function getSocketUrl({
  env = import.meta.env,
  location = window.location,
} = {}) {
  return (
    normalizeRuntimeOrigin(env?.VITE_SOCKET_URL) ??
    getLocalSocketUrl(location)
  )
}

function getPublicAppUrl({
  env = import.meta.env,
  location = window.location,
} = {}) {
  return (
    normalizeRuntimeOrigin(env?.VITE_PUBLIC_APP_URL) ??
    normalizeRuntimeOrigin(location.origin)
  )
}

function getPublicPhoneBaseUrl({ env = import.meta.env } = {}) {
  return (
    normalizePublicPhoneOrigin(env?.VITE_PUBLIC_PHONE_BASE_URL) ??
    normalizePublicPhoneOrigin(env?.VITE_PUBLIC_APP_URL)
  )
}

function getMotorServiceUrl({ env = import.meta.env } = {}) {
  return (
    normalizeRuntimeOrigin(env?.VITE_MOTOR_SERVICE_URL) ??
    defaultMotorServiceUrl
  )
}

export {
  defaultMotorServiceUrl,
  defaultSocketPort,
  getLocalSocketUrl,
  getMotorServiceUrl,
  getPublicAppUrl,
  getPublicPhoneBaseUrl,
  getSocketUrl,
  normalizePublicPhoneOrigin,
  normalizeRuntimeOrigin,
}
