import { useContext } from 'react'
import SessionContext from './SessionContext'

function useExperience() {
  const context = useContext(SessionContext)

  if (!context) {
    throw new Error(
      'useExperience doit être utilisé dans un ExperienceProvider.',
    )
  }

  return context
}

export default useExperience
