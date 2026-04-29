import { NativeStackScreenProps } from '@react-navigation/native-stack'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, View } from 'react-native'
import { getFontScaleSync } from 'react-native-device-info'
import { SafeAreaView } from 'react-native-safe-area-context'
import { isAddressFormat } from 'src/account/utils'
import AppAnalytics from 'src/analytics/AppAnalytics'
import { SendEvents } from 'src/analytics/Events'
import { SendOrigin } from 'src/analytics/types'
import { getAppConfig } from 'src/appConfig'
import BackButton from 'src/components/BackButton'
import KeyboardAwareScrollView from 'src/components/KeyboardAwareScrollView'
import CustomHeader from 'src/components/header/CustomHeader'
import CircledIcon from 'src/icons/CircledIcon'
import { importContacts } from 'src/identity/actions'
import { addressToVerifiedBySelector, e164NumberToAddressSelector } from 'src/identity/selectors'
import { RecipientVerificationStatus } from 'src/identity/types'
import { noHeader } from 'src/navigator/Headers'
import { navigate } from 'src/navigator/NavigationService'
import { Screens } from 'src/navigator/Screens'
import { StackParamList } from 'src/navigator/types'
import RecipientPicker from 'src/recipients/RecipientPickerV2'
import { Recipient, RecipientType, recipientHasNumber } from 'src/recipients/recipient'
import { useDispatch, useSelector } from 'src/redux/hooks'
import PasteAddressButton from 'src/send/PasteAddressButton'
import SelectRecipientButtons from 'src/send/SelectRecipientButtons'
import { SendSelectRecipientSearchInput } from 'src/send/SendSelectRecipientSearchInput'
import { useMergedSearchRecipients, useSendRecipients } from 'src/send/hooks'
import useFetchRecipientVerificationStatus from 'src/send/useFetchRecipientVerificationStatus'
import colors from 'src/styles/colors'
import { typeScale } from 'src/styles/fonts'
import { Spacing } from 'src/styles/styles'
import variables from 'src/styles/variables'

type Props = NativeStackScreenProps<StackParamList, Screens.SendSelectRecipient>

function GetStartedSection() {
  const { t } = useTranslation()
  const phoneNumberVerificationEnabled = getAppConfig().experimental?.phoneNumberVerification
  const ensSupported = !!getAppConfig().experimental?.alchemyApiKey

  const renderOption = ({
    optionNum,
    title,
    subtitle,
    showNum,
  }: {
    optionNum: string
    title: string
    subtitle: string
    showNum: boolean
  }) => {
    return (
      <View key={`getStartedOption-${optionNum}`} style={getStartedStyles.optionWrapper}>
        {showNum && (
          <CircledIcon
            radius={Math.min(24 * getFontScaleSync(), 50)}
            style={getStartedStyles.optionNum}
            backgroundColor={colors.backgroundPrimary}
          >
            <Text adjustsFontSizeToFit={true} style={getStartedStyles.optionNumText}>
              {optionNum}
            </Text>
          </CircledIcon>
        )}
        <View style={getStartedStyles.optionText}>
          <Text style={getStartedStyles.optionTitle}>{title}</Text>
          <Text style={getStartedStyles.optionSubtitle}>{subtitle}</Text>
        </View>
      </View>
    )
  }

  const getStartedOptions = [
    {
      id: 'address',
      condition: () => true, // Always show
      title: t('sendSelectRecipient.getStarted.options.one.title'),
      subtitle: t('sendSelectRecipient.getStarted.options.one.subtitle'),
    },
    {
      id: 'phone',
      condition: () => phoneNumberVerificationEnabled,
      title: t('sendSelectRecipient.getStarted.options.two.title'),
      subtitle: t('sendSelectRecipient.getStarted.options.two.subtitle'),
    },
    {
      id: 'ens',
      condition: () => ensSupported,
      title: t('sendSelectRecipient.getStarted.options.three.title'),
      subtitle: t('sendSelectRecipient.getStarted.options.three.subtitle'),
    },
  ]

  const options = getStartedOptions
    .filter((option) => option.condition())
    .map((option, index) => ({
      optionNum: (index + 1).toString(),
      title: option.title,
      subtitle: option.subtitle,
    }))

  return (
    <View style={getStartedStyles.container} testID={'SelectRecipient/GetStarted'}>
      <View>
        <Text style={getStartedStyles.subtitle}>
          {t('sendSelectRecipient.getStarted.subtitle')}
        </Text>
        <Text style={getStartedStyles.title}>{t('sendSelectRecipient.getStarted.title')}</Text>
      </View>
      {options.map((params) => renderOption({ ...params, showNum: options.length > 1 }))}
    </View>
  )
}

const getStartedStyles = StyleSheet.create({
  container: {
    backgroundColor: colors.backgroundSecondary,
    padding: Spacing.Thick24,
    margin: Spacing.Regular16,
    marginTop: Spacing.Large32,
    borderRadius: 10,
    borderColor: colors.borderPrimary,
    borderWidth: 1,
    gap: Spacing.Regular16,
  },
  subtitle: {
    ...typeScale.labelXXSmall,
    color: colors.contentSecondary,
  },
  title: {
    ...typeScale.labelMedium,
  },
  optionWrapper: {
    flexDirection: 'row',
    gap: Spacing.Smallest8,
  },
  optionNum: {
    borderWidth: 1,
    borderColor: colors.borderSecondary,
  },
  optionNumText: {
    ...typeScale.labelXSmall,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    ...typeScale.labelSmall,
    paddingBottom: Spacing.Tiny4,
  },
  optionSubtitle: {
    ...typeScale.bodyXSmall,
    color: colors.contentSecondary,
  },
})

enum SelectRecipientView {
  Recent = 'Recent',
  Contacts = 'Contacts',
}

function SendSelectRecipient({ route }: Props) {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const e164NumberToAddress = useSelector(e164NumberToAddressSelector)
  const addressToVerifiedBy = useSelector(addressToVerifiedBySelector)
  const shareUrl = getAppConfig().experimental?.inviteFriends?.shareUrl ?? null

  const forceTokenId = route.params?.forceTokenId
  const defaultTokenIdOverride = route.params?.defaultTokenIdOverride

  const [showSearchResults, setShowSearchResults] = useState(false)

  const [activeView, setActiveView] = useState(SelectRecipientView.Recent)

  const onSearch = (searchQuery: string) => {
    // Clear any in-flight selection so a stale recipient can't auto-navigate
    // once the user starts typing a different query.
    unsetSelectedRecipient()
    setShowSearchResults(!!searchQuery)
  }
  const { contactRecipients, recentRecipients } = useSendRecipients()
  const { mergedRecipients, searchQuery, setSearchQuery } = useMergedSearchRecipients(onSearch)

  const {
    recipientVerificationStatus,
    recipient,
    setSelectedRecipient,
    unsetSelectedRecipient,
    isSelectedRecipientLoading,
  } = useFetchRecipientVerificationStatus()

  useEffect(() => {
    // Auto-navigate once verification resolves. The picker stays mounted so the
    // user's search text and selection are preserved when they come back.
    if (!recipient || recipientVerificationStatus === RecipientVerificationStatus.UNKNOWN) {
      return
    }

    const isUnverifiedPhone =
      recipient.recipientType === RecipientType.PhoneNumber &&
      recipientVerificationStatus === RecipientVerificationStatus.UNVERIFIED

    if (isUnverifiedPhone) {
      if (shareUrl) {
        navigate(Screens.SendInvite, { recipient, shareUrl })
      }
      // Without shareUrl there's no invite flow and no send flow for an
      // unverified phone — stay on the picker so the user can pick someone else.
      return
    }

    AppAnalytics.track(SendEvents.send_select_recipient_send_press, {
      recipientType: recipient.recipientType,
    })
    nextScreen(recipient)
  }, [recipient, recipientVerificationStatus, shareUrl])

  const onContactsPermissionGranted = () => {
    dispatch(importContacts())
    setActiveView(SelectRecipientView.Contacts)
  }

  const shouldShowClipboard = (content: string) => {
    return content !== searchQuery && isAddressFormat(content)
  }

  const onSelectRecentRecipient = (recentRecipient: Recipient) => {
    AppAnalytics.track(SendEvents.send_select_recipient_recent_press, {
      recipientType: recentRecipient.recipientType,
    })
    nextScreen(recentRecipient)
  }

  const nextScreen = (selectedRecipient: Recipient) => {
    // use the address from the recipient object
    let address: string | null | undefined = selectedRecipient.address

    // if not present there must be a phone number, route through the address picker
    // when multiple verified addresses exist, otherwise go directly to amount entry
    if (!address && recipientHasNumber(selectedRecipient)) {
      const phoneAddresses = e164NumberToAddress[selectedRecipient.e164PhoneNumber] ?? []
      const verifiedAddresses = phoneAddresses.filter((a) => !!addressToVerifiedBy[a])

      if (verifiedAddresses.length > 1) {
        navigate(Screens.SelectRecipientAddress, {
          forceTokenId,
          defaultTokenIdOverride,
          recipient: selectedRecipient,
          origin: SendOrigin.AppSendFlow,
        })
        return
      }

      address = verifiedAddresses[0] ?? phoneAddresses[0]
    }

    if (!address) {
      // this should never happen
      throw new Error('No address found, this should never happen. Should have routed to invite.')
    }

    navigate(Screens.SendEnterAmount, {
      isFromScan: false,
      defaultTokenIdOverride,
      forceTokenId,
      recipient: {
        ...selectedRecipient,
        address,
      },
      origin: SendOrigin.AppSendFlow,
      isMiniPayRecipient: addressToVerifiedBy?.[address] === 'minipay',
    })
  }

  const renderSearchResults = () => {
    if (mergedRecipients.length) {
      return (
        <>
          <Text style={styles.searchResultsHeader}>{t('sendSelectRecipient.results')}</Text>
          <RecipientPicker
            testID={'SelectRecipient/AllRecipientsPicker'}
            recipients={mergedRecipients}
            onSelectRecipient={setSelectedRecipient}
            selectedRecipient={recipient}
            isSelectedRecipientLoading={isSelectedRecipientLoading}
          />
        </>
      )
    } else {
      return (
        <View testID={'SelectRecipient/NoResults'} style={styles.noResultsWrapper}>
          <Text style={styles.noResultsTitle}>
            {t('noResultsFor')}
            <Text style={styles.noResultsTitle}>{` "${searchQuery}"`}</Text>
          </Text>
          <Text style={styles.noResultsSubtitle}>{t('searchForSomeone')}</Text>
        </View>
      )
    }
  }

  return (
    <SafeAreaView style={styles.body} edges={['top']}>
      <CustomHeader
        style={{ paddingHorizontal: variables.contentPadding }}
        left={<BackButton />}
        title={
          activeView === SelectRecipientView.Contacts
            ? t('sendSelectRecipient.contactsHeader')
            : t('sendSelectRecipient.header')
        }
      />
      <View style={styles.inputContainer}>
        <SendSelectRecipientSearchInput input={searchQuery} onChangeText={setSearchQuery} />
      </View>
      <KeyboardAwareScrollView keyboardDismissMode="on-drag">
        <PasteAddressButton
          shouldShowClipboard={shouldShowClipboard}
          onChangeText={setSearchQuery}
          value={''}
        />
        {showSearchResults ? (
          renderSearchResults()
        ) : activeView === SelectRecipientView.Contacts ? (
          <RecipientPicker
            testID={'SelectRecipient/ContactRecipientPicker'}
            recipients={contactRecipients}
            onSelectRecipient={setSelectedRecipient}
            selectedRecipient={recipient}
            isSelectedRecipientLoading={isSelectedRecipientLoading}
          />
        ) : (
          <>
            <SelectRecipientButtons
              defaultTokenIdOverride={defaultTokenIdOverride}
              onContactsPermissionGranted={onContactsPermissionGranted}
            />
            {activeView === SelectRecipientView.Recent && recentRecipients.length ? (
              <RecipientPicker
                testID={'SelectRecipient/RecentRecipientPicker'}
                recipients={recentRecipients}
                title={t('sendSelectRecipient.recents')}
                onSelectRecipient={onSelectRecentRecipient}
                selectedRecipient={recipient}
                isSelectedRecipientLoading={isSelectedRecipientLoading}
                style={styles.recentRecipientPicker}
              />
            ) : (
              <GetStartedSection />
            )}
          </>
        )}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  )
}

SendSelectRecipient.navigationOptions = noHeader

const styles = StyleSheet.create({
  inputContainer: {
    padding: Spacing.Regular16,
    paddingTop: Spacing.Smallest8,
  },
  body: {
    flex: 1,
    paddingBottom: variables.contentPadding,
  },
  recentRecipientPicker: {
    paddingTop: Spacing.Regular16,
  },
  searchResultsHeader: {
    ...typeScale.labelXSmall,
    color: colors.contentSecondary,
    paddingHorizontal: Spacing.Regular16,
    paddingVertical: Spacing.Smallest8,
  },
  noResultsWrapper: {
    textAlign: 'center',
    marginTop: Spacing.Small12,
    padding: Spacing.Regular16,
  },
  noResultsTitle: {
    ...typeScale.bodyMedium,
    color: colors.contentSecondary,
    textAlign: 'center',
  },
  noResultsSubtitle: {
    ...typeScale.labelXSmall,
    color: colors.contentSecondary,
    justifyContent: 'center',
    padding: Spacing.Regular16,
    textAlign: 'center',
  },
})

export default SendSelectRecipient
