import { useContext } from 'react'
import RealtimeSessionContext from './RealtimeSessionContext'

function useRealtimeSession() {
  const context = useContext(RealtimeSessionContext)

  if (!context) {
    throw new Error(
      'useRealtimeSession must be used inside RealtimeSessionProvider.',
    )
  }

  return context
}

export default useRealtimeSession
