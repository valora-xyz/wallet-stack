import { ConfigPlugin, withPlugins } from '@expo/config-plugins'

import { withAndroidUserAgent } from './withAndroidUserAgent'
import { withAndroidWindowSoftInputModeAdjustNothing } from './withAndroidWindowSoftInputModeAdjustNothing'
import { withIosAppDelegateResetKeychain } from './withIosAppDelegateResetKeychain'
import { withIosLiquidGlassCompat } from './withIosLiquidGlassCompat'
import { withIosUserAgent } from './withIosUserAgent'

/**
 * A config plugin for configuring `wallet-stack`
 */
const withMobileApp: ConfigPlugin<{ appName?: string }> = (config, props = {}) => {
  return withPlugins(config, [
    // iOS
    withIosAppDelegateResetKeychain,
    [withIosUserAgent, props],
    withIosLiquidGlassCompat,

    // Android
    [withAndroidUserAgent, props],
    withAndroidWindowSoftInputModeAdjustNothing,
  ])
}

export default withMobileApp
