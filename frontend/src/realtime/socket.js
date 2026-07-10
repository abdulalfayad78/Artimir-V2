import { io } from 'socket.io-client'
import { logSessionDiagnostic } from './sessionDiagnostics'
import { getSocketUrl } from './runtimeUrls'

let socketInstance = null
let pendingDisconnectTimer = null

function createArtimirSocket() {
  const socketUrl = getSocketUrl()
  logSessionDiagnostic('socket:create', { socketUrl })

  return io(socketUrl, {
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 4_000,
    timeout: 5_000,
    transports: ['websocket', 'polling'],
  })
}

function getArtimirSocket() {
  if (!socketInstance) {
    socketInstance = createArtimirSocket()
  }

  return socketInstance
}

function cancelScheduledSocketDisconnect() {
  if (pendingDisconnectTimer !== null) {
    window.clearTimeout(pendingDisconnectTimer)
    pendingDisconnectTimer = null
  }
}

function scheduleSocketDisconnect() {
  cancelScheduledSocketDisconnect()
  pendingDisconnectTimer = window.setTimeout(() => {
    pendingDisconnectTimer = null
    socketInstance?.disconnect()
  }, 0)
}

export {
  cancelScheduledSocketDisconnect,
  getArtimirSocket,
  getSocketUrl,
  scheduleSocketDisconnect,
}
