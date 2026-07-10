import http from 'node:http'
import fs from 'node:fs'
import { stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Server } from 'socket.io'
import {
  SESSION_STATUSES,
  SOCKET_EVENTS,
  createEventEnvelope,
} from '../shared/sessionProtocol.js'
import { createNetworkUrls, getLocalIPv4 } from './network.js'
import { SessionStore } from './sessionStore.js'
import { registerSocketHandlers } from './socketHandlers.js'
import { logServerSession } from './sessionLogger.js'
import {
  createAllowedOrigins,
  createCorsOriginValidator,
  normalizeOrigin,
  parseOriginList,
} from './cors.js'

function readPositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function getRequestPathname(request) {
  try {
    return new URL(
      request.url ?? '/',
      'http://artimir.local',
    ).pathname
  } catch {
    return '/'
  }
}

const currentFile = fileURLToPath(import.meta.url)
const serverDir = path.dirname(currentFile)
const projectRoot = path.resolve(serverDir, '..')
const defaultStaticDir = path.resolve(projectRoot, 'frontend', 'dist')
const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.wasm', 'application/wasm'],
  ['.webp', 'image/webp'],
])

function sendJson(response, statusCode, payload, headers = {}) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    ...headers,
  })
  response.end(JSON.stringify(payload))
}

function isSocketIoRequest(pathname) {
  return pathname === '/socket.io' || pathname.startsWith('/socket.io/')
}

function isSafeStaticPath(staticDir, pathname) {
  let decodedPath = pathname

  try {
    decodedPath = decodeURIComponent(pathname)
  } catch {
    return null
  }

  const absolutePath = path.resolve(
    staticDir,
    decodedPath.replace(/^\/+/, ''),
  )
  const relativePath = path.relative(staticDir, absolutePath)

  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    return null
  }

  return absolutePath
}

async function fileExists(filePath) {
  try {
    const fileStat = await stat(filePath)
    return fileStat.isFile()
  } catch {
    return false
  }
}

async function sendStaticFile(request, response, filePath) {
  const extension = path.extname(filePath).toLowerCase()
  const contentType =
    contentTypes.get(extension) ?? 'application/octet-stream'

  response.writeHead(200, {
    'Content-Type': contentType,
  })

  if (request.method === 'HEAD') {
    response.end()
    return
  }

  fs.createReadStream(filePath).pipe(response)
}

function createArtimirServer(options = {}) {
  const port =
    options.port ??
    readPositiveInteger(
      process.env.PORT ?? process.env.ARTIMIR_SERVER_PORT,
      3001,
    )
  const host = options.host ?? '0.0.0.0'
  const sessionTtlMs =
    options.sessionTtlMs ??
    readPositiveInteger(
      process.env.ARTIMIR_SESSION_TTL_MS,
      900_000,
    )
  const clientPort =
    options.clientPort ??
    readPositiveInteger(process.env.ARTIMIR_CLIENT_PORT, 5173)
  const clientProtocol =
    options.clientProtocol ??
    process.env.ARTIMIR_CLIENT_PROTOCOL ??
    'http'
  const localAddress = options.localAddress ?? getLocalIPv4()
  const publicAppOrigins =
    options.publicAppOrigins ??
    parseOriginList(process.env.PUBLIC_APP_ORIGIN)
  const publicPhoneBaseUrl =
    options.publicPhoneBaseUrl ??
    process.env.PUBLIC_PHONE_BASE_URL ??
    publicAppOrigins[0]
  const allowedOrigins =
    options.allowedOrigins ??
    createAllowedOrigins({
      clientPort,
      clientProtocol,
      localAddress,
      publicAppOrigins,
    })
  const store = new SessionStore({ ttlMs: sessionTtlMs })
  const staticDir = options.staticDir ?? defaultStaticDir
  const staticIndexPath = path.join(staticDir, 'index.html')

  const httpServer = http.createServer(async (request, response) => {
    const pathname = getRequestPathname(request)

    if (
      request.method === 'GET' &&
      (pathname === '/health' || pathname === '/health/')
    ) {
      const requestOrigin = normalizeOrigin(request.headers.origin)
      const headers = {}

      if (requestOrigin && allowedOrigins.has(requestOrigin)) {
        headers['Access-Control-Allow-Origin'] = requestOrigin
      }

      sendJson(
        response,
        200,
        {
          status: 'ok',
          service: 'artimir-realtime',
        },
        headers,
      )
      return
    }

    if (
      isSocketIoRequest(pathname) ||
      !['GET', 'HEAD'].includes(request.method)
    ) {
      sendJson(response, 404, { error: 'NOT_FOUND' })
      return
    }

    const staticPath = isSafeStaticPath(staticDir, pathname)
    const requestedFilePath =
      staticPath && pathname !== '/' ? staticPath : null

    if (
      requestedFilePath &&
      (await fileExists(requestedFilePath))
    ) {
      await sendStaticFile(request, response, requestedFilePath)
      return
    }

    if (await fileExists(staticIndexPath)) {
      await sendStaticFile(request, response, staticIndexPath)
      return
    }

    sendJson(response, 404, { error: 'NOT_FOUND' })
  })

  const io = new Server(httpServer, {
    cors: {
      origin: createCorsOriginValidator(allowedOrigins),
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  })

  const { emitSessionState } = registerSocketHandlers(io, store, {
    clientPort,
    serverPort: port,
    clientProtocol,
    localAddress,
    publicPhoneBaseUrl,
    publicAppOrigin: publicAppOrigins[0],
  })

  const expirationTimer = setInterval(() => {
    store.getExpired().forEach((session) => {
      session.status = SESSION_STATUSES.sessionExpired
      session.activeScene = null
      emitSessionState(session)
      io.to(`session:${session.id}`).emit(
        SOCKET_EVENTS.sessionError,
        createEventEnvelope(session.id, {
          code: 'SESSION_EXPIRED',
          message: 'Session expired',
        }),
      )
      store.remove(session.id)
      logServerSession('session:expired-and-removed', {
        sessionCode: session.id,
      })
    })
  }, Math.min(30_000, Math.max(1_000, sessionTtlMs / 4)))
  expirationTimer.unref()

  function listen() {
    return new Promise((resolve, reject) => {
      const handleError = (error) => {
        httpServer.off('listening', handleListening)
        reject(error)
      }
      const handleListening = () => {
        httpServer.off('error', handleError)
        resolve(httpServer.address())
      }

      httpServer.once('error', handleError)
      httpServer.once('listening', handleListening)
      httpServer.listen(port, host)
    })
  }

  function close() {
    clearInterval(expirationTimer)

    return new Promise((resolve) => {
      io.close(() => {
        if (httpServer.listening) {
          httpServer.close(resolve)
        } else {
          resolve()
        }
      })
    })
  }

  return {
    close,
    httpServer,
    io,
    listen,
    store,
    config: {
      clientPort,
      clientProtocol,
      host,
      localAddress,
      port,
      publicAppOrigins,
      staticDir,
      sessionTtlMs,
    },
  }
}

async function startFromCommandLine() {
  const server = createArtimirServer()
  await server.listen()
  const urls = createNetworkUrls({
    localAddress: server.config.localAddress,
    clientPort: server.config.clientPort,
    serverPort: server.config.port,
    clientProtocol: server.config.clientProtocol,
    publicAppOrigin: server.config.publicAppOrigins[0],
  })

  console.log('\nARTIMIR — serveur local prêt')
  console.log(`Adresse IPv4 :      ${urls.localAddress}`)
  console.log(`Écran (local) :     ${urls.displayLocalUrl}`)
  console.log(`Écran (réseau) :    ${urls.displayNetworkUrl}`)
  console.log(`Socket.IO :         ${urls.socketUrl}`)
  console.log(
    'Test : ouvrez l’URL écran, puis scannez le QR code affiché.\n',
  )
}

const launchedFile = process.argv[1]
  ? path.resolve(process.argv[1])
  : null

if (launchedFile === currentFile) {
  startFromCommandLine().catch((error) => {
    console.error('Impossible de démarrer le serveur Artimir.', error)
    process.exitCode = 1
  })
}

export { createArtimirServer }
