import { useCallback } from 'react'
import useExperience from '../context/useExperience'
import {
  defaultLanguage,
  translations,
  translate,
} from './translations'

function useTranslation() {
  const { session } = useExperience()
  const language = translations[session.language]
    ? session.language
    : defaultLanguage
  const direction = language === 'ar' ? 'rtl' : 'ltr'
  const t = useCallback(
    (key, variables) => translate(language, key, variables),
    [language],
  )

  return {
    t,
    language,
    direction,
    isRtl: direction === 'rtl',
  }
}

export default useTranslation
