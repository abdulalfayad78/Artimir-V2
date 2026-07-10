import os from 'node:os'
import QRCode from 'qrcode'

function normalizePublicAppOrigin(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    return null
  }

  try {
    return new URL(value.trim()).origin
  } catch {
    return null
  }
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
  const origin = normalizePublicAppOrigin(value)

  if (!origin) {
    return null
  }

  const url = new URL(origin)
  const hostname = url.hostname.toLowerCase()
  const isLocalHostname =
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname === '0.0.0.0'

  if (url.protocol !== 'https:' || isLocalHostname || isPrivateIPv4(hostname)) {
    return null
  }

  return origin
}

function getLocalIPv4() {
  const candidates = []

  Object.entries(os.networkInterfaces()).forEach(
    ([interfaceName, addresses = []]) => {
      addresses.forEach((address) => {
        if (
          address.family === 'IPv4' &&
          !address.internal &&
          !address.address.startsWith('169.254.')
        ) {
          const normalizedName = interfaceName.toLowerCase()
          const score =
            normalizedName.includes('wi-fi') ||
            normalizedName.includes('wifi') ||
            normalizedName.includes('ethernet')
              ? 1
              : 0

          candidates.push({ address: address.address, score })
        }
      })
    },
  )

  candidates.sort((left, right) => right.score - left.score)
  return candidates[0]?.address ?? '127.0.0.1'
}

function createNetworkUrls({
  localAddress = getLocalIPv4(),
  clientPort = 5173,
  serverPort = 3001,
  clientProtocol = 'http',
  publicAppOrigin,
  sessionId,
} = {}) {
  const clientOrigin = `${clientProtocol}://${localAddress}:${clientPort}`
  const phoneOrigin = normalizePublicPhoneOrigin(publicAppOrigin)
  const sessionQuery = sessionId
    ? `?session=${encodeURIComponent(sessionId)}`
    : ''
  const phoneUrl = sessionId && phoneOrigin
    ? `${phoneOrigin}/#/phone/languages${sessionQuery}`
    : null
  const phoneUrlError = sessionId && !phoneOrigin
    ? 'URL publique téléphone non configurée'
    : null

  return {
    localAddress,
    displayLocalUrl: `http://localhost:${clientPort}/#/display`,
    displayNetworkUrl: `${clientOrigin}/#/display`,
    phoneBaseUrl: phoneOrigin,
    phoneUrl,
    phoneUrlError,
    qrMode: phoneOrigin ? 'public' : 'unconfigured',
    socketUrl: `http://${localAddress}:${serverPort}`,
  }
}

async function createPhoneQrCode(phoneUrl) {
  return QRCode.toDataURL(phoneUrl, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 512,
    color: {
      dark: '#050505',
      light: '#f5f5f5',
    },
  })
}

export {
  createNetworkUrls,
  createPhoneQrCode,
  getLocalIPv4,
  normalizePublicAppOrigin,
  normalizePublicPhoneOrigin,
}
