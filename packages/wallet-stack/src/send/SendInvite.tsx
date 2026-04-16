import { NativeStackScreenProps } from '@react-navigation/native-stack'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Share from 'react-native-share'
import { showError } from 'src/alert/actions'
import AppAnalytics from 'src/analytics/AppAnalytics'
import { SendEvents } from 'src/analytics/Events'
import { ErrorMessages } from 'src/app/ErrorMessages'
import Button, { BtnSizes } from 'src/components/Button'
import { inviteModal } from 'src/images/Images'
import { headerWithBackButton } from 'src/navigator/Headers'
import { Screens } from 'src/navigator/Screens'
import { StackParamList } from 'src/navigator/types'
import { getDisplayName } from 'src/recipients/recipient'
import { useDispatch } from 'src/redux/hooks'
import { typeScale } from 'src/styles/fonts'
import { Spacing } from 'src/styles/styles'
import Logger from 'src/utils/Logger'

type Props = NativeStackScreenProps<StackParamList, Screens.SendInvite>

function SendInvite({ route }: Props) {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const { recipient, shareUrl } = route.params
  const contact = getDisplayName(recipient, t)

  const handleShareInvite = async () => {
    AppAnalytics.track(SendEvents.send_select_recipient_invite_press, {
      recipientType: recipient.recipientType,
    })

    try {
      await Share.open({
        message: t('inviteWithSmsMessage.shareMessage', { shareUrl }),
        url: shareUrl,
        failOnCancel: false,
      })
    } catch (error) {
      Logger.error('SendInvite', 'Share sheet failed', error)
      dispatch(showError(ErrorMessages.SHARE_INVITE_FAILED))
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.imageContainer}>
          <Image source={inviteModal} resizeMode="contain" />
        </View>
        <Text style={styles.title}>{t('sendInvite.title', { contact })}</Text>
        <Text style={styles.body}>{t('sendInvite.body')}</Text>
      </ScrollView>
      <Button
        testID="SendInvite/ShareButton"
        style={styles.button}
        onPress={handleShareInvite}
        text={t('sendInvite.cta')}
        size={BtnSizes.FULL}
      />
    </SafeAreaView>
  )
}

SendInvite.navigationOptions = headerWithBackButton

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  scrollContent: {
    padding: Spacing.Thick24,
  },
  imageContainer: {
    alignItems: 'center',
    paddingTop: Spacing.Thick24,
    paddingBottom: Spacing.Regular16,
  },
  title: {
    ...typeScale.titleMedium,
    textAlign: 'center',
    marginTop: Spacing.Large32,
    paddingHorizontal: Spacing.Regular16,
  },
  body: {
    ...typeScale.bodyMedium,
    textAlign: 'center',
    marginTop: Spacing.Regular16,
    paddingHorizontal: Spacing.Regular16,
  },
  button: {
    padding: Spacing.Thick24,
  },
})

export default SendInvite
