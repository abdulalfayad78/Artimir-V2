function sessionLogsEnabled() {
  return process.env.ARTIMIR_SESSION_LOGS !== 'false'
}

function logServerSession(event, details = {}) {
  if (!sessionLogsEnabled()) {
    return
  }

  console.info(
    `[${new Date().toISOString()}] [Artimir server] ${event}`,
    details,
  )
}

export { logServerSession }
