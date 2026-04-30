import ResetAccount from './usecases/ResetAccount'
import Settings from './usecases/Settings'
import Support from './usecases/Support'
import { quickOnboarding } from './utils/utils'

describe('Account :ios:', () => {
  beforeAll(async () => {
    await quickOnboarding()
  })

  describe('Support', Support)
  describe('Settings', Settings)
  describe('Reset Account', ResetAccount)
})
