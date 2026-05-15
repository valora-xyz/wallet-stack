import { launchApp } from './utils/retries'
import { quickOnboarding, waitForElementById } from './utils/utils'

const verifyCamera = async () => {
  // testID 'Camera' is one of the few that works on Android. iOS uses 'CameraScanInfo' because the camera is behind an opacity overlay
  device.getPlatform() === 'ios'
    ? await waitForElementById('CameraScanInfo')
    : await waitForElementById('Camera')
}

describe("Given QR Scanner / When 'scanning' address-only QR", () => {
  beforeAll(async () => {
    await quickOnboarding()
    await waitForElementById('HomeAction-Receive', { tap: true })
    await waitForElementById('Scan', { tap: true })
    await verifyCamera()
  })

  it('Then should handle address only QR', async () => {
    // Use instead of waitForElementById as the element is not visible behind opacity overlay
    await element(by.text('Center code in the box above')).tap()
    await waitForElementById('ManualInput')
    await element(by.id('ManualInput')).replaceText('0xe5F5363e31351C38ac82DBAdeaD91Fd5a7B08846')
    await waitForElementById('ManualSubmit')
    await element(by.id('ManualSubmit')).tap()

    await element(by.text('Enter Amount')).tap() // dismiss the keyboard to reveal the proceed button
    await expect(element(by.id('SendEnterAmount/ReviewButton'))).toBeVisible()
  })
})
