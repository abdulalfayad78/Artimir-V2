import assert from 'node:assert/strict'
import test from 'node:test'

import { ageRangeOptions, artFamiliarityOptions } from '../frontend/src/data/profileOptions.js'
import { translations, translate } from '../frontend/src/i18n/translations.js'
import {
  PHONE_PROFILE_STEPS,
  createCompletePhoneProfile,
  getInitialPhoneProfileStep,
  getVisiblePhoneProfileSections,
  goBackToPhoneProfileAge,
  selectPhoneProfileAge,
} from '../frontend/src/profile/phoneProfileFlow.js'

test('phone profile starts on age only', () => {
  const step = getInitialPhoneProfileStep({})
  const visibleSections = getVisiblePhoneProfileSections(step)

  assert.equal(step, PHONE_PROFILE_STEPS.age)
  assert.equal(visibleSections.age, true)
  assert.equal(visibleSections.familiarity, false)
})

test('choosing an age keeps it locally and shows familiarity', () => {
  const nextState = selectPhoneProfileAge(
    {
      ageRange: null,
      artFamiliarity: null,
      step: PHONE_PROFILE_STEPS.age,
    },
    '18_30',
  )
  const visibleSections = getVisiblePhoneProfileSections(nextState.step)

  assert.equal(nextState.ageRange, '18_30')
  assert.equal(nextState.artFamiliarity, null)
  assert.equal(visibleSections.age, false)
  assert.equal(visibleSections.familiarity, true)
})

test('age selection alone does not create a complete profile payload', () => {
  const incompletePayload = createCompletePhoneProfile({
    ageRange: '18_30',
    artFamiliarity: null,
  })

  assert.equal(incompletePayload, null)
})

test('choosing familiarity creates the same complete payload as before', () => {
  const completePayload = createCompletePhoneProfile({
    ageRange: '18_30',
    artFamiliarity: 'regular',
  })

  assert.deepEqual(completePayload, {
    ageRange: '18_30',
    artFamiliarity: 'regular',
  })
})

test('back from familiarity returns to age without losing the chosen age', () => {
  const nextState = goBackToPhoneProfileAge({
    ageRange: '18_30',
    artFamiliarity: null,
    step: PHONE_PROFILE_STEPS.familiarity,
  })
  const visibleSections = getVisiblePhoneProfileSections(nextState.step)

  assert.equal(nextState.ageRange, '18_30')
  assert.equal(visibleSections.age, true)
  assert.equal(visibleSections.familiarity, false)
})

test('profile i18n keys are available for FR, EN, AR and ES', () => {
  for (const language of Object.keys(translations)) {
    assert.notEqual(translate(language, 'profile.title'), 'profile.title')
    assert.notEqual(
      translate(language, 'profile.ageTitle'),
      'profile.ageTitle',
    )
    assert.notEqual(
      translate(language, 'profile.familiarityTitle'),
      'profile.familiarityTitle',
    )
    assert.notEqual(translate(language, 'common.back'), 'common.back')

    for (const option of ageRangeOptions) {
      assert.notEqual(
        translate(language, option.labelKey),
        option.labelKey,
      )
    }

    for (const option of artFamiliarityOptions) {
      assert.notEqual(
        translate(language, option.labelKey),
        option.labelKey,
      )
    }
  }
})
