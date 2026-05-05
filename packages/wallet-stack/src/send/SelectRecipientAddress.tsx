import { NativeStackScreenProps } from '@react-navigation/native-stack'
import React, { useEffect } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import AppAnalytics from 'src/analytics/AppAnalytics'
import { SendEvents } from 'src/analytics/Events'
import BackButton from 'src/components/BackButton'
import CustomHeader from 'src/components/header/CustomHeader'
import { addressToVerifiedBySelector, e164NumberToAddressSelector } from 'src/identity/selectors'
import { noHeader } from 'src/navigator/Headers'
import { navigate } from 'src/navigator/NavigationService'
import { Screens } from 'src/navigator/Screens'
import { StackParamList } from 'src/navigator/types'
import { getDisplayName } from 'src/recipients/recipient'
import { Verifier, isKnownVerifier } from 'src/recipients/verifier'
import { useSelector } from 'src/redux/hooks'
import SelectRecipientAddressList from 'src/send/SelectRecipientAddressList'
import Colors from 'src/styles/colors'
import { typeScale } from 'src/styles/fonts'
import { Spacing } from 'src/styles/styles'

type Props = NativeStackScreenProps<StackParamList, Screens.SelectRecipientAddress>

function SelectRecipientAddress({ route }: Props) {
  const { t } = useTranslation()
  const { recipient, origin, forceTokenId, defaultTokenIdOverride } = route.params

  const e164NumberToAddress = useSelector(e164NumberToAddressSelector)
  const addressToVerifiedBy = useSelector(addressToVerifiedBySelector)

  const addresses = e164NumberToAddress[recipient.e164PhoneNumber] || []
  const verifiedEntries = addresses
    .map((address) => ({ address, verifier: addressToVerifiedBy[address] }))
    .filter((entry): entry is { address: string; verifier: Verifier } =>
      isKnownVerifier(entry.verifier)
    )

  useEffect(() => {
    AppAnalytics.track(SendEvents.send_select_recipient_address_open, {
      addressCount: verifiedEntries.length,
    })
  }, [])

  const onSelectAddress = (address: string, verifier: Verifier) => {
    AppAnalytics.track(SendEvents.send_select_recipient_address_select, {
      verifier,
    })
    navigate(Screens.SendEnterAmount, {
      isFromScan: false,
      defaultTokenIdOverride,
      forceTokenId,
      recipient: {
        ...recipient,
        address,
      },
      origin,
      skipRecipientLookup: true,
    })
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <CustomHeader
        style={styles.customHeader}
        left={<BackButton eventName={SendEvents.send_select_recipient_address_back} />}
      />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{t('selectRecipientAddress.header')}</Text>
        <Text style={styles.explanation}>
          <Trans
            i18nKey="selectRecipientAddress.explanation"
            tOptions={{ name: getDisplayName(recipient, t) }}
          >
            <Text style={styles.explanationName} />
          </Trans>
        </Text>
        <SelectRecipientAddressList entries={verifiedEntries} onSelectAddress={onSelectAddress} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  customHeader: {
    paddingHorizontal: Spacing.Thick24,
  },
  scrollContent: {
    paddingBottom: Spacing.Smallest8,
  },
  title: {
    ...typeScale.titleMedium,
    paddingHorizontal: Spacing.Regular16,
    paddingTop: Spacing.Thick24,
    marginBottom: Spacing.Smallest8,
  },
  explanation: {
    ...typeScale.bodySmall,
    color: Colors.contentSecondary,
    paddingHorizontal: Spacing.Regular16,
    paddingBottom: Spacing.Regular16,
  },
  explanationName: {
    fontWeight: 'bold',
  },
})

SelectRecipientAddress.navigationOptions = noHeader

export default SelectRecipientAddress
