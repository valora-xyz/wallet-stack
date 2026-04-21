import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LayoutAnimation, StyleSheet, Text, View } from 'react-native'
import { formatShortenedAddress } from 'src/account/utils'
import AccountNumber from 'src/components/AccountNumber'
import Expandable from 'src/components/Expandable'
import Touchable from 'src/components/Touchable'
import { Screens } from 'src/navigator/Screens'
import { getDisplayName, Recipient, recipientHasNumber } from 'src/recipients/recipient'
import { useVerifierName } from 'src/recipients/verifier'
import colors from 'src/styles/colors'
import { typeScale } from 'src/styles/fonts'

interface Props {
  type: 'sent' | 'received' | 'withdrawn'
  addressHasChanged?: boolean
  recipient: Recipient
  avatar: React.ReactNode
  expandable?: boolean
  testID?: string
}

export default function UserSection({
  type,
  addressHasChanged = false,
  recipient,
  avatar,
  expandable = true,
  testID = '',
}: Props) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(expandable && addressHasChanged)

  const toggleExpanded = () => {
    LayoutAnimation.easeInEaseOut()
    setExpanded(!expanded)
  }

  const displayName = getDisplayName(recipient, t)
  const address = recipient.address || ''

  const verifierName = useVerifierName(recipient.address)

  // Show short address in the secondary row when the primary (displayName) isn't already
  // a formatted address — i.e., when the recipient has a name or phone number so the
  // address would add information rather than duplicating the primary.
  const hasIdentity = !!recipient.name || recipientHasNumber(recipient)
  const shortAddress =
    hasIdentity && recipient.address ? formatShortenedAddress(recipient.address) : undefined

  const secondaryText = verifierName
    ? shortAddress
      ? `${shortAddress} · ${verifierName}`
      : verifierName
    : (shortAddress ?? null)

  const sectionLabel = {
    received: t('receivedFrom'),
    sent: t('sentTo'),
    withdrawn: t('withdrawnTo'),
  }[type]

  return (
    <View>
      <View style={styles.header}>
        <View style={styles.userContainer}>
          <Text style={styles.sectionLabel}>{sectionLabel}</Text>
          <Touchable onPress={toggleExpanded} disabled={!expandable}>
            <>
              <Expandable isExpandable={expandable && !secondaryText} isExpanded={expanded}>
                <Text style={styles.username} testID={`${testID}/name`}>
                  {displayName}
                </Text>
              </Expandable>
              {!!secondaryText && (
                <Expandable isExpandable={expandable} isExpanded={expanded}>
                  <Text style={styles.secondary} testID={`${testID}/address`}>
                    {secondaryText}
                  </Text>
                </Expandable>
              )}
            </>
          </Touchable>
        </View>
        <View style={styles.avatarContainer}>{avatar}</View>
      </View>
      {expanded && (
        <View style={styles.expandedContainer}>
          {addressHasChanged && (
            <Text style={styles.addressHasChanged} testID={'transferAddressChanged'}>
              {t('transferAddressChanged')}
            </Text>
          )}
          <View style={styles.accountBox}>
            <Text style={styles.accountLabel}>{t('accountAddressLabel')}</Text>
            <AccountNumber address={address} location={Screens.TransactionDetailsScreen} />
          </View>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
  },
  sectionLabel: {
    ...typeScale.labelSemiBoldSmall,
    color: colors.contentSecondary,
    marginBottom: 4,
  },
  userContainer: {
    flex: 3,
    marginRight: 8,
  },
  username: {
    ...typeScale.bodyMedium,
  },
  secondary: {
    ...typeScale.bodySmall,
    color: colors.contentSecondary,
  },
  avatarContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  expandedContainer: {
    marginTop: 8,
  },
  addressHasChanged: {
    ...typeScale.bodySmall,
    color: colors.contentSecondary,
    marginBottom: 8,
  },
  accountBox: {
    borderRadius: 4,
    backgroundColor: colors.backgroundTertiary,
    flexDirection: 'column',
    padding: 16,
  },
  accountLabel: {
    ...typeScale.labelSemiBoldSmall,
    color: colors.contentSecondary,
  },
})
