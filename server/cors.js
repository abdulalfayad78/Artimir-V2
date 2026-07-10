function normalizeOrigin(origin) {
  if (typeof origin !== 'string' || origin.trim() === '') {
    return null
  }

  try {
    return new URL(origin.trim()).origin
  } catch {
    return null
  }
}

function parseOriginList(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeOrigin).filter(Boolean)
  }

  if (typeof value !== 'string') {
    return []
  }

  return value
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean)
}

function createAllowedOrigins({
  clientPort = 5173,
  clientProtocol = 'http',
  localAddress = '127.0.0.1',
  publicAppOrigin,
  publicAppOrigins,
} = {}) {
  return new Set([
    `${clientProtocol}://localhost:${clientPort}`,
    `${clientProtocol}://127.0.0.1:${clientPort}`,
    `${clientProtocol}://${localAddress}:${clientPort}`,
    ...parseOriginList(publicAppOrigin),
    ...parseOriginList(publicAppOrigins),
  ].map(normalizeOrigin).filter(Boolean))
}

function createCorsOriginValidator(allowedOrigins) {
  return (origin, callback) => {
    if (!origin) {
      callback(null, true)
      return
    }

    callback(null, allowedOrigins.has(normalizeOrigin(origin)))
  }
}

export {
  createAllowedOrigins,
  createCorsOriginValidator,
  normalizeOrigin,
  parseOriginList,
}
