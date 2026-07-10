const PHONE_PROFILE_STEPS = {
  age: 'age',
  familiarity: 'familiarity',
}

function getInitialPhoneProfileStep(profile = {}) {
  return profile.ageRange && !profile.artFamiliarity
    ? PHONE_PROFILE_STEPS.familiarity
    : PHONE_PROFILE_STEPS.age
}

function selectPhoneProfileAge(currentState, ageRange) {
  return {
    ...currentState,
    ageRange,
    step: PHONE_PROFILE_STEPS.familiarity,
  }
}

function goBackToPhoneProfileAge(currentState) {
  return {
    ...currentState,
    step: PHONE_PROFILE_STEPS.age,
  }
}

function getVisiblePhoneProfileSections(step) {
  return {
    age: step === PHONE_PROFILE_STEPS.age,
    familiarity: step === PHONE_PROFILE_STEPS.familiarity,
  }
}

function createCompletePhoneProfile({
  ageRange,
  artFamiliarity,
}) {
  if (!ageRange || !artFamiliarity) {
    return null
  }

  return {
    ageRange,
    artFamiliarity,
  }
}

export {
  PHONE_PROFILE_STEPS,
  createCompletePhoneProfile,
  getInitialPhoneProfileStep,
  getVisiblePhoneProfileSections,
  goBackToPhoneProfileAge,
  selectPhoneProfileAge,
}
