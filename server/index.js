import http from 'node:http'
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
  const allowedOrigins =
    options.allowedOrigins ??
    createAllowedOrigins({
      clientPort,
      clientProtocol,
      localAddress,
      publicAppOrigins,
    })
  const store = new SessionStore({ ttlMs: sessionTtlMs })

  const httpServer = http.createServer((request, response) => {
    const pathname = getRequestPathname(request)

    if (
      request.method === 'GET' &&
      (pathname === '/health' || pathname === '/health/')
    ) {
      const requestOrigin = normalizeOrigin(request.headers.origin)
      const headers = {
        'Content-Type': 'application/json; charset=utf-8',
      }

      if (requestOrigin && allowedOrigins.has(requestOrigin)) {
        headers['Access-Control-Allow-Origin'] = requestOrigin
      }

      response.writeHead(200, {
        ...headers,
      })
      response.end(
        JSON.stringify({
          status: 'ok',
          service: 'artimir-realtime',
        }),
      )
      return
    }

    response.writeHead(404, {
      'Content-Type': 'application/json; charset=utf-8',
    })
    response.end(JSON.stringify({ error: 'NOT_FOUND' }))
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

const currentFile = fileURLToPath(import.meta.url)
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
