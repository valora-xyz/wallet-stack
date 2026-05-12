import ResetAccount from './usecases/ResetAccount'
import { launchApp } from './utils/retries'
import { quickOnboarding } from './utils/utils'

describe('Account', () => {
  beforeAll(async () => {
    await quickOnboarding()
  })

  describe('Reset Account', ResetAccount)
})
