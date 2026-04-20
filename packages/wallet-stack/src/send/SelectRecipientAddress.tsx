import { NativeStackScreenProps } from '@react-navigation/native-stack'
import React from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { formatShortenedAddress } from 'src/account/utils'
import BackButton from 'src/components/BackButton'
import Touchable from 'src/components/Touchable'
import CustomHeader from 'src/components/header/CustomHeader'
import { addressToVerifiedBySelector, e164NumberToAddressSelector } from 'src/identity/selectors'
import { miniPay, valora } from 'src/images/Images'
import { noHeader } from 'src/navigator/Headers'
import { navigate } from 'src/navigator/NavigationService'
import { Screens } from 'src/navigator/Screens'
import { StackParamList } from 'src/navigator/types'
import { getDisplayName } from 'src/recipients/recipient'
import { useSelector } from 'src/redux/hooks'
import Colors from 'src/styles/colors'
import { typeScale } from 'src/styles/fonts'
import { Spacing } from 'src/styles/styles'

type Props = NativeStackScreenProps<StackParamList, Screens.SelectRecipientAddress>

type Verifier = 'valora' | 'minipay'

const VERIFIER_NAMES: Record<Verifier, string> = {
  valora: 'Valora',
  minipay: 'MiniPay',
}

const ICON_SIZE = 40

const VERIFIER_ICONS: Record<Verifier, number> = {
  valora,
  minipay: miniPay,
}

function isKnownVerifier(verifier: string | undefined): verifier is Verifier {
  return !!verifier && verifier in VERIFIER_NAMES
}

function VerifierIcon({ verifier }: { verifier: Verifier }) {
  return <Image source={VERIFIER_ICONS[verifier]} style={styles.icon} resizeMode="contain" />
}

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

  const onSelectAddress = (address: string, verifier: Verifier) => {
    navigate(Screens.SendEnterAmount, {
      isFromScan: false,
      defaultTokenIdOverride,
      forceTokenId,
      recipient: {
        ...recipient,
        address,
      },
      origin,
      isMiniPayRecipient: verifier === 'minipay',
    })
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <CustomHeader style={styles.customHeader} left={<BackButton />} />
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
        {verifiedEntries.map(({ address, verifier }) => (
          <Touchable
            key={address}
            onPress={() => onSelectAddress(address, verifier)}
            testID={`SelectRecipientAddress/Row/${address}`}
          >
            <View style={styles.row}>
              <VerifierIcon verifier={verifier} />
              <View style={styles.rowContent}>
                <Text style={styles.address}>{formatShortenedAddress(address)}</Text>
                <Text style={styles.verifier}>
                  {t('selectRecipientAddress.verifiedBy', {
                    verifier: VERIFIER_NAMES[verifier],
                  })}
                </Text>
              </View>
            </View>
          </Touchable>
        ))}
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
  icon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.Regular16,
    paddingVertical: Spacing.Regular16,
  },
  rowContent: {
    flex: 1,
    marginLeft: Spacing.Small12,
  },
  address: {
    ...typeScale.labelMedium,
  },
  verifier: {
    ...typeScale.bodySmall,
    color: Colors.contentSecondary,
  },
})

SelectRecipientAddress.navigationOptions = noHeader

export default SelectRecipientAddress
