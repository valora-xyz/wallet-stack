import * as React from 'react'
import { StyleSheet, Text } from 'react-native'
import { getAppConfig } from 'src/appConfig'
import { typeScale } from 'src/styles/fonts'

export default function WelcomeLogo() {
  const CustomWelcomeLogo = getAppConfig().themes?.default?.assets?.welcomeLogo
  if (CustomWelcomeLogo) {
    return <CustomWelcomeLogo />
  }

  return <Text style={styles.header}>Wallet Stack</Text>
}

const styles = StyleSheet.create({
  header: {
    ...typeScale.displaySmall,
    textAlign: 'center',
  },
})
