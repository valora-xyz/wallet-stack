import React from 'react'
import { useTranslation } from 'react-i18next'
import { Image, StyleSheet, Text, View } from 'react-native'
import { formatShortenedAddress } from 'src/account/utils'
import Touchable from 'src/components/Touchable'
import AttentionIcon from 'src/icons/Attention'
import WalletIcon from 'src/icons/navigator/Wallet'
import VerifiedBadge from 'src/icons/VerifiedBadge'
import { VERIFIERS, Verifier } from 'src/recipients/verifier'
import Colors from 'src/styles/colors'
import { typeScale } from 'src/styles/fonts'
import { Spacing } from 'src/styles/styles'

const ICON_SIZE = 40

function VerifierIcon({ verifier }: { verifier: Verifier | null }) {
  if (!verifier) {
    return (
      <View style={styles.unverifiedIcon}>
        <WalletIcon color={Colors.contentPrimary} size={24} />
      </View>
    )
  }
  return <Image source={VERIFIERS[verifier].icon} style={styles.icon} resizeMode="contain" />
}

export interface Entry {
  address: string
  verifier: Verifier | null
}

interface Props {
  entries: Entry[]
  onSelectAddress(address: string, verifier: Verifier | null): void
  // Compact rows for the in-sheet variant — the standalone screen keeps the original padding.
  compact?: boolean
}

export default function SelectRecipientAddressList({ entries, onSelectAddress, compact }: Props) {
  const { t } = useTranslation()
  return (
    <>
      {entries.map(({ address, verifier }) => (
        <Touchable
          key={address}
          onPress={() => onSelectAddress(address, verifier)}
          testID={`SelectRecipientAddress/Row/${address}`}
        >
          <View style={[styles.row, compact && styles.rowCompact]}>
            <VerifierIcon verifier={verifier} />
            <View style={styles.rowContent}>
              <Text style={styles.address}>{formatShortenedAddress(address)}</Text>
              {verifier ? (
                <View style={styles.verifier}>
                  <VerifiedBadge color={Colors.contentSecondary} />
                  <Text style={styles.verifierName}>{VERIFIERS[verifier].name}</Text>
                </View>
              ) : (
                <View style={styles.verifier}>
                  <AttentionIcon size={14} color={Colors.warningPrimary} />
                  <Text style={styles.unverifiedText}>{t('unverifiedAddress')}</Text>
                </View>
              )}
            </View>
          </View>
        </Touchable>
      ))}
    </>
  )
}

const styles = StyleSheet.create({
  icon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
  },
  unverifiedIcon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE / 2,
    backgroundColor: Colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.borderPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.Regular16,
    paddingVertical: Spacing.Regular16,
  },
  rowCompact: {
    paddingHorizontal: 0,
    paddingVertical: Spacing.Smallest8,
  },
  rowContent: {
    flex: 1,
    marginLeft: Spacing.Small12,
  },
  address: {
    ...typeScale.labelMedium,
  },
  verifier: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.Tiny4,
  },
  verifierName: {
    ...typeScale.bodySmall,
    color: Colors.contentSecondary,
  },
  unverifiedText: {
    ...typeScale.bodySmall,
    color: Colors.warningPrimary,
  },
})
