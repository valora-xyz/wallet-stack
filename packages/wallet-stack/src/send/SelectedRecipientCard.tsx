import React, { memo, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { formatShortenedAddress } from 'src/account/utils'
import BottomSheet, { BottomSheetModalRefType } from 'src/components/BottomSheet'
import ContactCircle from 'src/components/ContactCircle'
import Touchable from 'src/components/Touchable'
import AttentionIcon from 'src/icons/Attention'
import DownArrowIcon from 'src/icons/DownArrowIcon'
import PhoneIcon from 'src/icons/Phone'
import UserIcon from 'src/icons/User'
import VerifiedBadge from 'src/icons/VerifiedBadge'
import WalletIcon from 'src/icons/navigator/Wallet'
import { Recipient } from 'src/recipients/recipient'
import { type Verifier, useVerifierName } from 'src/recipients/verifier'
import SelectRecipientAddressList, { type Entry } from 'src/send/SelectRecipientAddressList'
import { type RecipientLookupStatus, type VerifiedAddressEntry } from 'src/send/useRecipientLookup'
import Colors from 'src/styles/colors'
import { typeScale } from 'src/styles/fonts'
import { Spacing } from 'src/styles/styles'

const SECONDARY_ROW_MIN_HEIGHT = 20

interface Props {
  recipient: Recipient & { address: string }
  status: RecipientLookupStatus
  verifiedAddresses: VerifiedAddressEntry[]
  // The address the recipient was navigated in with. If it's not in the verified set
  // (e.g. came from recents and the mapping no longer holds), it stays selectable in the
  // sheet as an unverified option so the user can switch back after picking a verified one.
  originalAddress: string
  onSelectAddress(address: string, isMiniPay: boolean): void
}

function SelectedRecipientCard({
  recipient,
  status,
  verifiedAddresses,
  originalAddress,
  onSelectAddress,
}: Props) {
  const { t } = useTranslation()
  const sheetRef = useRef<BottomSheetModalRefType>(null)

  const verifierName = useVerifierName(recipient.address)
  const isLoading = status === 'loading'

  const originalIsVerified = verifiedAddresses.some(
    (entry) => entry.address.toLowerCase() === originalAddress.toLowerCase()
  )
  const sheetEntries: Entry[] = originalIsVerified
    ? verifiedAddresses
    : [...verifiedAddresses, { address: originalAddress, verifier: null }]

  const hasAlternative = sheetEntries.some(
    (entry) => entry.address.toLowerCase() !== recipient.address.toLowerCase()
  )
  const isTappable = !isLoading && hasAlternative

  const onPress = isTappable ? () => sheetRef.current?.snapToIndex(0) : undefined

  const onSelectFromSheet = (address: string, verifier: Verifier | null) => {
    sheetRef.current?.close()
    onSelectAddress(address, verifier === 'minipay')
  }

  const contact = useMemo(() => {
    const shortAddress = formatShortenedAddress(recipient.address)
    const phone = recipient.displayNumber || recipient.e164PhoneNumber
    if (recipient.name) return { title: recipient.name, icon: UserIcon, shortAddress }
    if (phone) return { title: phone, icon: PhoneIcon, shortAddress }
    return { title: shortAddress, icon: WalletIcon, shortAddress: undefined }
  }, [recipient])

  const renderSecondary = () => {
    const { shortAddress } = contact

    if (status === 'unverified' && shortAddress) {
      return (
        <View style={styles.secondaryRow} testID="SelectedRecipientCard/Unverified">
          <Text style={[styles.secondaryText, styles.warningText]}>{shortAddress}</Text>
          <AttentionIcon size={14} color={Colors.warningPrimary} />
          <Text style={[styles.secondaryText, styles.warningText]}>{t('unverifiedAddress')}</Text>
        </View>
      )
    }

    if (!shortAddress && !verifierName) return null

    return (
      <View style={styles.secondaryRow}>
        {!!shortAddress && <Text style={styles.secondaryText}>{shortAddress}</Text>}
        {!!verifierName && (
          <>
            <VerifiedBadge color={Colors.contentSecondary} />
            <Text style={styles.secondaryText}>{verifierName}</Text>
          </>
        )}
      </View>
    )
  }

  const secondary = renderSecondary()

  return (
    <View style={styles.summary} testID="SelectedRecipientCard">
      <Touchable
        style={styles.content}
        onPress={onPress}
        disabled={!onPress}
        testID="SelectedRecipientCard/Touchable"
      >
        <>
          <ContactCircle
            size={32}
            backgroundColor={Colors.backgroundTertiary}
            foregroundColor={Colors.contentPrimary}
            recipient={recipient}
            DefaultIcon={contact.icon}
          />
          <View style={styles.values}>
            <Text style={styles.primary} numberOfLines={1} ellipsizeMode="middle">
              {contact.title}
            </Text>
            {secondary ? <View style={styles.secondaryWrapper}>{secondary}</View> : null}
          </View>
          {isLoading ? (
            <ActivityIndicator
              size="small"
              color={Colors.loadingIndicator}
              testID="SelectedRecipientCard/Spinner"
            />
          ) : isTappable ? (
            <DownArrowIcon height={24} color={Colors.contentSecondary} />
          ) : null}
        </>
      </Touchable>
      {hasAlternative && (
        <BottomSheet
          forwardedRef={sheetRef}
          title={t('selectRecipientAddress.header')}
          snapPoints={['90%']}
          testId="SelectRecipientAddressSheet"
        >
          <SelectRecipientAddressList
            entries={sheetEntries}
            onSelectAddress={onSelectFromSheet}
            compact
          />
        </BottomSheet>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  summary: {
    borderWidth: 1,
    borderColor: Colors.borderPrimary,
    borderRadius: Spacing.Small12,
    backgroundColor: Colors.backgroundSecondary,
    padding: Spacing.Regular16,
  },
  content: {
    flexDirection: 'row',
    gap: Spacing.Smallest8,
    alignItems: 'center',
  },
  values: {
    flex: 1,
    flexShrink: 1,
  },
  primary: {
    ...typeScale.labelMedium,
  },
  secondaryWrapper: {
    height: SECONDARY_ROW_MIN_HEIGHT,
    justifyContent: 'center',
  },
  secondaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.Tiny4,
    flexShrink: 1,
  },
  secondaryText: {
    ...typeScale.bodySmall,
    color: Colors.contentSecondary,
  },
  warningText: {
    color: Colors.warningPrimary,
  },
})

export default memo(SelectedRecipientCard)
