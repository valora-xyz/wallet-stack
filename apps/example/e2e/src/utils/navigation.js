import { waitForElementById } from './utils'

/**
 * Imperatively reset navigation to the Home tab. Used as a `beforeEach` reset
 * in place of `reloadReactNative()`, which is broken on Android + RN 0.81
 * (Detox's reload leaks views from the previous tree).
 *
 * Uses the `cash-in-failure` deep link as transport — it's the only existing
 * public URL that resolves to navigateInitialTab() (CommonActions.reset →
 * TabNavigator).
 *
 * TODO: remove once we're on Fabric and reloadReactNative() is reliable
 * again on Android.
 */
export async function navigateToHome() {
  await device.openURL({ url: 'celo://wallet/cash-in-failure' })
  await waitForElementById('WalletHome/SettingsGearButton')
}

export async function navigateToSecurity() {
  await waitForElementById('WalletHome/SettingsGearButton', {
    tap: true,
  })
  await waitForElementById('SettingsMenu/Security', {
    tap: true,
  })
}

export async function navigateToProfile() {
  await waitForElementById('WalletHome/SettingsGearButton', {
    tap: true,
  })
  await waitForElementById('SettingsMenu/Profile', {
    tap: true,
  })
}

export async function navigateToPreferences() {
  await waitForElementById('WalletHome/SettingsGearButton', {
    tap: true,
  })
  await waitForElementById('SettingsMenu/Preferences', {
    tap: true,
  })
}
