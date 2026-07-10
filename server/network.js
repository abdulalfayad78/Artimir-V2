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
  const phoneOrigin =
    normalizePublicAppOrigin(publicAppOrigin) ?? clientOrigin
  const sessionQuery = sessionId
    ? `?session=${encodeURIComponent(sessionId)}`
    : ''

  return {
    localAddress,
    displayLocalUrl: `http://localhost:${clientPort}/#/display`,
    displayNetworkUrl: `${clientOrigin}/#/display`,
    phoneUrl: sessionId
      ? `${phoneOrigin}/#/phone/languages${sessionQuery}`
      : null,
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
}
