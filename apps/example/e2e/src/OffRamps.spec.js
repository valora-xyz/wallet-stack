import offRamps from './usecases/OffRamps'
import { launchApp } from './utils/retries'
import { quickOnboarding } from './utils/utils'

describe('Ramps', () => {
  beforeAll(async () => {
    await quickOnboarding()
  })

  describe('Given Cash Out', offRamps)
})
