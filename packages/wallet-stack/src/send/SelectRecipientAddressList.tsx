import React from 'react'
import { Image, StyleSheet, Text, View } from 'react-native'
import { formatShortenedAddress } from 'src/account/utils'
import Touchable from 'src/components/Touchable'
import VerifiedBadge from 'src/icons/VerifiedBadge'
import { VERIFIERS, Verifier } from 'src/recipients/verifier'
import Colors from 'src/styles/colors'
import { typeScale } from 'src/styles/fonts'
import { Spacing } from 'src/styles/styles'

const ICON_SIZE = 40

interface Entry {
  address: string
  verifier: Verifier
}

interface Props {
  entries: Entry[]
  onSelectAddress(address: string, verifier: Verifier): void
}

export default function SelectRecipientAddressList({ entries, onSelectAddress }: Props) {
  return (
    <>
      {entries.map(({ address, verifier }) => (
        <Touchable
          key={address}
          onPress={() => onSelectAddress(address, verifier)}
          testID={`SelectRecipientAddress/Row/${address}`}
        >
          <View style={styles.row}>
            <Image source={VERIFIERS[verifier].icon} style={styles.icon} resizeMode="contain" />
            <View style={styles.rowContent}>
              <Text style={styles.address}>{formatShortenedAddress(address)}</Text>
              <View style={styles.verifier}>
                <VerifiedBadge color={Colors.contentSecondary} />
                <Text style={styles.verifierName}>{VERIFIERS[verifier].name}</Text>
              </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.Tiny4,
  },
  verifierName: {
    ...typeScale.bodySmall,
    color: Colors.contentSecondary,
  },
})
