import Settings from './usecases/Settings'
import { launchApp } from './utils/retries'
import { quickOnboarding } from './utils/utils'

describe('Account', () => {
  beforeAll(async () => {
    await quickOnboarding()
  })

  describe('Settings', Settings)
})
