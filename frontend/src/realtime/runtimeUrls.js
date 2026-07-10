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
  getSocketUrl,
  normalizeRuntimeOrigin,
}
