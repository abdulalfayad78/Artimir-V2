import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  readStorage,
  storageKeys,
  writeStorage,
} from '../realtime/clientIdentity'
import SessionContext from './SessionContext'

const initialSession = {
  language: null,
  ageRange: null,
  artFamiliarity: null,
  customization: null,
  selectedArtwork: null,
}

function getInitialSession() {
  const storedSession = readStorage(storageKeys.experience)

  if (!storedSession) {
    return initialSession
  }

  try {
    return {
      ...initialSession,
      ...JSON.parse(storedSession),
    }
  } catch {
    return initialSession
  }
}

function ExperienceProvider({ children }) {
  const [session, setSession] = useState(getInitialSession)

  useEffect(() => {
    writeStorage(storageKeys.experience, JSON.stringify(session))
  }, [session])

  const updateField = useCallback((field, value) => {
    setSession((currentSession) =>
      currentSession[field] === value
        ? currentSession
        : {
            ...currentSession,
            [field]: value,
          },
    )
  }, [])

  const setLanguage = useCallback(
    (language) => updateField('language', language),
    [updateField],
  )
  const setAgeRange = useCallback(
    (ageRange) => updateField('ageRange', ageRange),
    [updateField],
  )
  const setArtFamiliarity = useCallback(
    (artFamiliarity) =>
      updateField('artFamiliarity', artFamiliarity),
    [updateField],
  )
  const setCustomization = useCallback(
    (customization) =>
      updateField('customization', customization),
    [updateField],
  )
  const hydrateSession = useCallback((nextSession) => {
    setSession((currentSession) => {
      const mergedSession = {
        ...currentSession,
        ...nextSession,
      }
      const unchanged = Object.keys(mergedSession).every(
        (key) => mergedSession[key] === currentSession[key],
      )

      return unchanged ? currentSession : mergedSession
    })
  }, [])
  const resetExperience = useCallback(() => {
    setSession(initialSession)
    writeStorage(storageKeys.experience, null)
  }, [])

  const value = useMemo(
    () => ({
      session,
      setLanguage,
      setAgeRange,
      setArtFamiliarity,
      setCustomization,
      hydrateSession,
      resetExperience,
    }),
    [
      hydrateSession,
      resetExperience,
      session,
      setAgeRange,
      setArtFamiliarity,
      setCustomization,
      setLanguage,
    ],
  )

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  )
}

export { ExperienceProvider }
