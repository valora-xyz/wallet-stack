import React, { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Keyboard, StyleSheet, Text, View } from 'react-native'
import ContactCircle from 'src/components/ContactCircle'
import Touchable from 'src/components/Touchable'
import PhoneIcon from 'src/icons/Phone'
import WalletIcon from 'src/icons/navigator/Wallet'
import {
  Recipient,
  getDisplayDetail,
  getDisplayName,
  recipientHasNumber,
} from 'src/recipients/recipient'
import Colors from 'src/styles/colors'
import { typeScale } from 'src/styles/fonts'
import { Spacing } from 'src/styles/styles'

interface Props {
  recipient: Recipient
  onSelectRecipient(recipient: Recipient): void
  loading: boolean
  selected?: boolean
}

function RecipientItem({ recipient, onSelectRecipient, loading, selected }: Props) {
  const { t } = useTranslation()

  const onPress = () => {
    Keyboard.dismiss()
    onSelectRecipient(recipient)
  }

  return (
    <Touchable onPress={onPress} testID="RecipientItem">
      <View style={[styles.row, selected && styles.rowSelected]}>
        <View>
          <ContactCircle
            style={styles.avatar}
            recipient={recipient}
            backgroundColor={Colors.backgroundSecondary}
            foregroundColor={Colors.contentPrimary}
            borderColor={Colors.borderPrimary}
            DefaultIcon={() => renderDefaultIcon(recipient)} // no need to honor color props here since the color we need match the defaults
          />
        </View>
        <View style={styles.contentContainer}>
          <Text numberOfLines={1} ellipsizeMode={'tail'} style={styles.name}>
            {getDisplayName(recipient, t)}
          </Text>
          {!!recipient.name && <Text style={styles.phone}>{getDisplayDetail(recipient)}</Text>}
        </View>
        {loading && (
          <View style={styles.rightIconContainer}>
            <ActivityIndicator
              size="small"
              color={Colors.loadingIndicator}
              testID="RecipientItem/ActivityIndicator"
            />
          </View>
        )}
      </View>
    </Touchable>
  )
}

function renderDefaultIcon(recipient: Recipient) {
  if (recipientHasNumber(recipient)) {
    return <PhoneIcon color={Colors.contentPrimary} size={24} testID="RecipientItem/PhoneIcon" />
  } else {
    return <WalletIcon color={Colors.contentPrimary} size={24} testID="RecipientItem/WalletIcon" />
  }
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingVertical: Spacing.Regular16,
    paddingHorizontal: Spacing.Regular16,
    alignItems: 'center',
  },
  rowSelected: {
    backgroundColor: Colors.backgroundSecondary,
  },
  avatar: {
    marginRight: Spacing.Small12,
  },
  contentContainer: {
    flex: 1,
  },
  name: { ...typeScale.labelMedium },
  phone: {
    ...typeScale.bodySmall,
    color: Colors.contentSecondary,
  },
  rightIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
})

export default memo(RecipientItem)
