import NewAccountOnboarding from './usecases/NewAccountOnboarding'

// Split out of AccountSetup.spec.js so each onboarding flow runs in its own
// spec. The usecase handles its own delete + launchApp internally in beforeAll.
describe('Account Setup', () => {
  describe('New Account', NewAccountOnboarding)
})
