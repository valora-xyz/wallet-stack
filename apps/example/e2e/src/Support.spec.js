import Support from './usecases/Support'
import { launchApp } from './utils/retries'
import { quickOnboarding } from './utils/utils'

describe('Account', () => {
  beforeAll(async () => {
    await quickOnboarding()
  })

  describe('Support', Support)
})
