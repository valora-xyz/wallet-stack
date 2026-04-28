import { ConfigPlugin, withInfoPlist } from '@expo/config-plugins'

/**
 * Opt the app out of iOS 26's Liquid Glass redesign by setting
 * `UIDesignRequiresCompatibility` in Info.plist. The flag is ignored on
 * iOS < 26, so older versions are unaffected.
 *
 * This is a temporary measure: Apple removes the flag in Xcode 27 and
 * Liquid Glass becomes mandatory by iOS 27. Track adoption of the new
 * design as tech debt and remove this mod once wallet-stack's nav bar
 * styling is updated for Liquid Glass.
 *
 * See https://www.donnywals.com/opting-your-app-out-of-the-liquid-glass-redesign-with-xcode-26/
 */
export const withIosLiquidGlassCompat: ConfigPlugin = (config) => {
  return withInfoPlist(config, (config) => {
    config.modResults.UIDesignRequiresCompatibility = true
    return config
  })
}
