import { launchApp } from './utils/retries'
import { quickOnboarding, waitForElementById } from './utils/utils'

const verifyCamera = async () => {
  // testID 'Camera' is one of the few that works on Android. iOS uses 'CameraScanInfo' because the camera is behind an opacity overlay
  device.getPlatform() === 'ios'
    ? await waitForElementById('CameraScanInfo')
    : await waitForElementById('Camera')
}

describe('Given QR Scanner', () => {
  beforeAll(async () => {
    await quickOnboarding()
  })

  describe('When opening QR scanner', () => {
    it('Then should display QR code', async () => {
      await waitForElementById('HomeAction-Receive', { tap: true })
      await waitForElementById('QRCode')
    })

    it('Then should be able to toggle camera', async () => {
      await waitForElementById('Scan', { tap: true })
      await verifyCamera()
    })

    it('Then should be able to toggle to QR code', async () => {
      await waitForElementById('My Code', { tap: true })
      await waitForElementById('QRCode')
    })

    it('Then should be able to close QR code scanner', async () => {
      await waitForElementById('Times', { tap: true })
      await waitForElementById('HomeAction-Send')
    })
  })
})
