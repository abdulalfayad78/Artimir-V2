function diagnosticsEnabled() {
  if (import.meta.env.DEV) {
    return true
  }

  try {
    return (
      localStorage.getItem('artimir.debugSession') === 'true' ||
      window.location.href.includes('debugSession=true')
    )
  } catch {
    return false
  }
}

function logSessionDiagnostic(event, details = {}) {
  if (!diagnosticsEnabled()) {
    return
  }

  console.info(
    `[${new Date().toISOString()}] [Artimir client] ${event}`,
    details,
  )
}

export { logSessionDiagnostic }
