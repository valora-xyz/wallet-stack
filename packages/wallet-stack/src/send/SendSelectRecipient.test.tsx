import Clipboard from '@react-native-clipboard/clipboard'
import { act, fireEvent, render, waitFor } from '@testing-library/react-native'
import * as React from 'react'
import { Provider } from 'react-redux'
import AppAnalytics from 'src/analytics/AppAnalytics'
import { SendEvents } from 'src/analytics/Events'
import { SendOrigin } from 'src/analytics/types'
import { getAppConfig } from 'src/appConfig'
import {
  fetchAddressVerification,
  fetchAddressesAndValidate,
  recipientLookupResolved,
} from 'src/identity/actions'
import { navigate } from 'src/navigator/NavigationService'
import { Screens } from 'src/navigator/Screens'
import { RecipientType } from 'src/recipients/recipient'
import SendSelectRecipient from 'src/send/SendSelectRecipient'
import { getDynamicConfigParams } from 'src/statsig'
import { StatsigDynamicConfigs } from 'src/statsig/types'
import { setupStore } from 'src/redux/store'
import { createMockStore, getMockStackScreenProps, getMockStoreData } from 'test/utils'
import {
  mockAccount,
  mockAccount2,
  mockAccount3,
  mockAddressRecipient,
  mockDisplayNumber2Invite,
  mockE164Number2Invite,
  mockE164Number3,
  mockPhoneRecipientCache,
  mockRecipient,
  mockRecipient2,
} from 'test/values'

jest.mock('@react-native-clipboard/clipboard')
jest.mock('src/utils/IosVersionUtils')
jest.mock('src/recipients/resolve-id')

jest.mock('react-native-device-info', () => ({ getFontScaleSync: () => 1 }))
jest.mock('src/statsig')
jest.mock('src/redux/sagas', () => ({
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  rootSaga: jest.fn(function* () {}),
}))

const mockScreenProps = ({
  defaultTokenIdOverride,
  forceTokenId,
}: {
  defaultTokenIdOverride?: string
  forceTokenId?: boolean
}) =>
  getMockStackScreenProps(Screens.SendSelectRecipient, {
    defaultTokenIdOverride,
    forceTokenId,
  })

const defaultStore = {
  send: {
    recentRecipients: [mockRecipient, mockRecipient2],
  },
  recipients: {
    phoneRecipientCache: mockPhoneRecipientCache,
  },
}
const storeWithPhoneVerified = {
  ...defaultStore,
  app: { phoneNumberVerified: true },
}

describe('SendSelectRecipient', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(Clipboard.getString).mockResolvedValue('')
    jest.mocked(Clipboard.hasString).mockResolvedValue(false)
    jest.mocked(getDynamicConfigParams).mockImplementation(({ configName }) => {
      if (configName === StatsigDynamicConfigs.APP_CONFIG) {
        return {}
      }
      return {} as any
    })
    jest.mocked(getAppConfig).mockReturnValue({
      displayName: 'Test App',
      deepLinkUrlScheme: 'testapp',
      registryName: 'test',
      experimental: { phoneNumberVerification: true },
    })
  })

  it('shows contacts when send to contacts button is pressed and conditions are satisfied', async () => {
    const store = createMockStore(storeWithPhoneVerified)

    const { getByTestId, queryByTestId } = render(
      <Provider store={store}>
        <SendSelectRecipient {...mockScreenProps({})} />
      </Provider>
    )
    await act(() => {
      fireEvent.press(getByTestId('SelectRecipient/Contacts'))
    })
    expect(getByTestId('SelectRecipient/ContactRecipientPicker')).toBeTruthy()
    expect(queryByTestId('SelectRecipient/QR')).toBeFalsy()
    expect(queryByTestId('SelectRecipient/Contacts')).toBeFalsy()
    expect(queryByTestId('SelectRecipient/GetStarted')).toBeFalsy()
    expect(queryByTestId('SelectRecipient/RecentRecipientPicker')).toBeFalsy()
  })
  it('does not show contacts when send to contacts button is pressed and conditions are not satisfied', async () => {
    const store = createMockStore(defaultStore)

    const { getByTestId, queryByTestId } = render(
      <Provider store={store}>
        <SendSelectRecipient {...mockScreenProps({})} />
      </Provider>
    )
    await act(() => {
      fireEvent.press(getByTestId('SelectRecipient/Contacts'))
    })
    expect(getByTestId('SelectRecipient/RecentRecipientPicker')).toBeTruthy()
    expect(queryByTestId('SelectRecipient/ContactRecipientPicker')).toBeFalsy()
  })

  it('navigates to QR screen when QR button is pressed', async () => {
    const store = createMockStore(defaultStore)

    const { getByTestId } = render(
      <Provider store={store}>
        <SendSelectRecipient {...mockScreenProps({})} />
      </Provider>
    )
    fireEvent.press(getByTestId('SelectRecipient/QR'))
    expect(AppAnalytics.track).toHaveBeenCalledWith(SendEvents.send_select_recipient_scan_qr)
    expect(navigate).toHaveBeenCalledWith(Screens.QRNavigator, {
      screen: Screens.QRScanner,
      params: {
        defaultTokenIdOverride: undefined,
      },
    })
  })
  it('navigates to QR screen with an override when QR button is pressed', async () => {
    const store = createMockStore(defaultStore)

    const { getByTestId } = render(
      <Provider store={store}>
        <SendSelectRecipient {...mockScreenProps({ defaultTokenIdOverride: 'some-token-id' })} />
      </Provider>
    )
    fireEvent.press(getByTestId('SelectRecipient/QR'))
    expect(AppAnalytics.track).toHaveBeenCalledWith(SendEvents.send_select_recipient_scan_qr)
    expect(navigate).toHaveBeenCalledWith(Screens.QRNavigator, {
      screen: Screens.QRScanner,
      params: {
        defaultTokenIdOverride: 'some-token-id',
      },
    })
  })

  it('shows QR, sync contacts and get started section when no prior recipients', async () => {
    const store = createMockStore({})

    const { getByTestId } = render(
      <Provider store={store}>
        <SendSelectRecipient {...mockScreenProps({})} />
      </Provider>
    )
    expect(getByTestId('SelectRecipient/Contacts')).toBeTruthy()
    expect(getByTestId('SelectRecipient/QR')).toBeTruthy()
    expect(getByTestId('SelectRecipient/GetStarted')).toBeTruthy()
  })
  it('shows QR, sync contacts and recents when prior recipients exist', async () => {
    const store = createMockStore(defaultStore)

    const { getByTestId } = render(
      <Provider store={store}>
        <SendSelectRecipient {...mockScreenProps({})} />
      </Provider>
    )
    expect(getByTestId('SelectRecipient/Contacts')).toBeTruthy()
    expect(getByTestId('SelectRecipient/QR')).toBeTruthy()
    expect(getByTestId('SelectRecipient/RecentRecipientPicker')).toBeTruthy()
  })
  it('shows search when text is entered and result is present', async () => {
    const store = createMockStore(defaultStore)

    const { getByTestId } = render(
      <Provider store={store}>
        <SendSelectRecipient {...mockScreenProps({})} />
      </Provider>
    )
    const searchInput = getByTestId('SendSelectRecipientSearchInput')
    await act(() => {
      fireEvent.changeText(searchInput, 'John Doe')
    })
    expect(getByTestId('SelectRecipient/AllRecipientsPicker')).toBeTruthy()
  })
  it('shows no results available when text is entered and no results', async () => {
    const store = createMockStore(defaultStore)

    const { getByTestId } = render(
      <Provider store={store}>
        <SendSelectRecipient {...mockScreenProps({})} />
      </Provider>
    )
    const searchInput = getByTestId('SendSelectRecipientSearchInput')
    await act(() => {
      fireEvent.changeText(searchInput, 'Fake Name')
    })
    expect(getByTestId('SelectRecipient/NoResults')).toBeTruthy()
  })
  describe('selection spinner', () => {
    it('shows the spinner while the lookup is in flight and hides it once the saga resolves (error path)', async () => {
      // Reducer-backed store: tapping a recipient dispatches `fetchAddressesAndValidate`
      // which flips `recipientLookupLoading` to true; dispatching `recipientLookupResolved`
      // (the saga's `finally` branch) flips it back to false. We assert the row spinner
      // tracks the actual state transition, including the no-mapping (error) end state.
      const { store } = setupStore(getMockStoreData(storeWithPhoneVerified))

      const { getByTestId, queryByTestId } = render(
        <Provider store={store}>
          <SendSelectRecipient {...mockScreenProps({})} />
        </Provider>
      )

      await act(() => {
        fireEvent.changeText(getByTestId('SendSelectRecipientSearchInput'), 'George Bogart')
      })
      await act(() => {
        fireEvent.press(getByTestId('RecipientItem'))
      })

      expect(queryByTestId('RecipientItem/ActivityIndicator')).toBeTruthy()

      await act(() => {
        store.dispatch(recipientLookupResolved())
      })

      expect(queryByTestId('RecipientItem/ActivityIndicator')).toBeFalsy()
    })
  })

  it('navigates to send amount when a verified phone recipient is tapped in search results', async () => {
    const store = createMockStore({
      ...storeWithPhoneVerified,
      identity: {
        e164NumberToAddress: { [mockE164Number2Invite]: [mockAccount3] },
        addressToVerifiedBy: { [mockAccount3]: 'valora' },
      },
    })

    const { getByTestId } = render(
      <Provider store={store}>
        <SendSelectRecipient {...mockScreenProps({})} />
      </Provider>
    )
    const searchInput = getByTestId('SendSelectRecipientSearchInput')

    await act(() => {
      fireEvent.changeText(searchInput, 'George Bogart')
    })
    await act(() => {
      fireEvent.press(getByTestId('RecipientItem'))
    })

    expect(AppAnalytics.track).toHaveBeenCalledWith(SendEvents.send_select_recipient_send_press, {
      recipientType: RecipientType.PhoneNumber,
    })

    expect(navigate).toHaveBeenCalledWith(Screens.SendEnterAmount, {
      isFromScan: false,
      defaultTokenIdOverride: undefined,
      forceTokenId: undefined,
      recipient: expect.any(Object),
      origin: SendOrigin.AppSendFlow,
      isMiniPayRecipient: false,
    })
  })
  it('navigates to send amount when an address is tapped and the user phone number is not verified', async () => {
    const store = createMockStore({
      ...defaultStore,
      identity: {
        addressToVerifiedBy: { [mockAddressRecipient.address.toLowerCase()]: 'valora' },
      },
    })

    const { getByTestId } = render(
      <Provider store={store}>
        <SendSelectRecipient {...mockScreenProps({})} />
      </Provider>
    )
    const searchInput = getByTestId('SendSelectRecipientSearchInput')

    await act(() => {
      fireEvent.changeText(searchInput, mockAddressRecipient.address)
    })
    await act(() => {
      fireEvent.press(getByTestId('RecipientItem'))
    })

    expect(AppAnalytics.track).toHaveBeenCalledWith(SendEvents.send_select_recipient_send_press, {
      recipientType: RecipientType.Address,
    })
    expect(navigate).toHaveBeenCalledWith(Screens.SendEnterAmount, {
      isFromScan: false,
      defaultTokenIdOverride: undefined,
      forceTokenId: undefined,
      recipient: expect.any(Object),
      origin: SendOrigin.AppSendFlow,
      isMiniPayRecipient: false,
    })
  })

  it('dispatches address verification when an address is tapped and the user phone number is verified', async () => {
    const store = createMockStore({
      ...storeWithPhoneVerified,
      identity: {
        addressToVerifiedBy: { [mockAccount2.toLowerCase()]: 'valora' },
      },
    })

    const { getByTestId } = render(
      <Provider store={store}>
        <SendSelectRecipient {...mockScreenProps({})} />
      </Provider>
    )
    await waitFor(() => {
      expect(getByTestId('SendSelectRecipientSearchInput')).toBeTruthy()
    })
    const searchInput = getByTestId('SendSelectRecipientSearchInput')

    await act(() => {
      fireEvent.changeText(searchInput, mockAccount2)
    })

    expect(getByTestId('RecipientItem')).toHaveTextContent(
      'feedItemAddress, {"address":"0x1ff4...bc42"}',
      { exact: false }
    )

    await act(() => {
      fireEvent.press(getByTestId('RecipientItem'))
    })

    expect(store.getActions()).toEqual([fetchAddressVerification(mockAccount2.toLowerCase())])
  })
  it('does not navigate when an unverified phone recipient is tapped and no share URL is configured', async () => {
    const store = createMockStore({
      ...storeWithPhoneVerified,
      identity: {
        e164NumberToAddress: { [mockE164Number2Invite]: null },
      },
    })

    const { getByTestId } = render(
      <Provider store={store}>
        <SendSelectRecipient {...mockScreenProps({})} />
      </Provider>
    )
    await waitFor(() => {
      expect(getByTestId('SendSelectRecipientSearchInput')).toBeTruthy()
    })
    const searchInput = getByTestId('SendSelectRecipientSearchInput')

    await act(() => {
      fireEvent.changeText(searchInput, mockE164Number2Invite)
    })
    expect(getByTestId('RecipientItem')).toHaveTextContent(mockDisplayNumber2Invite, {
      exact: false,
    })
    await act(() => {
      fireEvent.press(getByTestId('RecipientItem'))
    })

    expect(store.getActions()).toEqual([fetchAddressesAndValidate(mockE164Number2Invite)])
    expect(navigate).not.toHaveBeenCalled()
  })

  it('navigates to the invite screen when an unverified phone number is tapped and share URL is configured', async () => {
    const shareUrl = 'https://example.test/invite'
    jest.mocked(getAppConfig).mockReturnValue({
      displayName: 'Test App',
      deepLinkUrlScheme: 'testapp',
      registryName: 'test',
      experimental: {
        phoneNumberVerification: true,
        inviteFriends: { shareUrl },
      },
    })

    const store = createMockStore({
      ...storeWithPhoneVerified,
      identity: {
        e164NumberToAddress: { [mockE164Number2Invite]: null },
      },
    })

    const { getByTestId } = render(
      <Provider store={store}>
        <SendSelectRecipient {...mockScreenProps({})} />
      </Provider>
    )

    const searchInput = getByTestId('SendSelectRecipientSearchInput')
    await act(() => {
      fireEvent.changeText(searchInput, mockE164Number2Invite)
    })
    await act(() => {
      fireEvent.press(getByTestId('RecipientItem'))
    })

    expect(navigate).toHaveBeenCalledWith(Screens.SendInvite, {
      recipient: expect.objectContaining({
        e164PhoneNumber: mockE164Number2Invite,
        recipientType: RecipientType.PhoneNumber,
      }),
      shareUrl,
    })

    // Search text is preserved so the user can return to the same picker state.
    expect(searchInput.props.value).toBe(mockE164Number2Invite)
  })

  it('navigates and dispatches address verification when an unknown address is tapped and the user phone number is verified', async () => {
    // addressToVerifiedBy entry is `null` → checked and not verified
    const store = createMockStore({
      ...storeWithPhoneVerified,
      identity: { addressToVerifiedBy: { [mockAccount2.toLowerCase()]: null } },
    })

    const { getByTestId } = render(
      <Provider store={store}>
        <SendSelectRecipient {...mockScreenProps({})} />
      </Provider>
    )
    await waitFor(() => {
      expect(getByTestId('SendSelectRecipientSearchInput')).toBeTruthy()
    })
    const searchInput = getByTestId('SendSelectRecipientSearchInput')

    await act(() => {
      fireEvent.changeText(searchInput, mockAccount2)
    })

    // ensure its an address recipient (not an address that's tied to a contact)
    expect(getByTestId('RecipientItem')).toHaveTextContent(
      'feedItemAddress, {"address":"0x1ff4...bc42"}',
      { exact: false }
    )

    await act(() => {
      fireEvent.press(getByTestId('RecipientItem'))
    })

    expect(store.getActions()).toEqual([fetchAddressVerification(mockAccount2.toLowerCase())])
    expect(navigate).toHaveBeenCalledWith(
      Screens.SendEnterAmount,
      expect.objectContaining({ origin: SendOrigin.AppSendFlow })
    )
  })
  it('skips verification request for an address when the user phone number is not verified', async () => {
    const store = createMockStore(defaultStore)

    const { getByTestId } = render(
      <Provider store={store}>
        <SendSelectRecipient {...mockScreenProps({})} />
      </Provider>
    )
    await waitFor(() => {
      expect(getByTestId('SendSelectRecipientSearchInput')).toBeTruthy()
    })
    const searchInput = getByTestId('SendSelectRecipientSearchInput')

    await act(() => {
      fireEvent.changeText(searchInput, mockAccount2)
    })

    // ensure its an address recipient (not an address that's tied to a contact)
    expect(getByTestId('RecipientItem')).toHaveTextContent(
      'feedItemAddress, {"address":"0x1ff4...bc42"}',
      { exact: false }
    )

    await act(() => {
      fireEvent.press(getByTestId('RecipientItem'))
    })

    expect(store.getActions()).toEqual([])
    // Navigation still proceeds — status is treated as UNVERIFIED locally.
    expect(navigate).toHaveBeenCalledWith(
      Screens.SendEnterAmount,
      expect.objectContaining({ origin: SendOrigin.AppSendFlow })
    )
  })
  it('shows paste button if clipboard has address content', async () => {
    const store = createMockStore(defaultStore)

    const { findByTestId } = render(
      <Provider store={store}>
        <SendSelectRecipient {...mockScreenProps({})} />
      </Provider>
    )
    await act(() => {
      jest.mocked(Clipboard.getString).mockResolvedValue(mockAccount)
      jest.mocked(Clipboard.hasString).mockResolvedValue(true)
    })

    jest.runOnlyPendingTimers()
    const pasteButton = await findByTestId('PasteAddressButton')
    expect(pasteButton).toBeTruthy()

    await act(() => {
      fireEvent.press(pasteButton)
    })
    const pasteButtonAfterPress = findByTestId('PasteAddressButton')
    await expect(pasteButtonAfterPress).rejects.toThrow()
  })

  it('navigates to send amount when a verified phone recipient with a single address is tapped', async () => {
    const store = createMockStore({
      ...storeWithPhoneVerified,
      identity: {
        e164NumberToAddress: { [mockE164Number3]: [mockAccount3] },
      },
    })

    const { getByTestId } = render(
      <Provider store={store}>
        <SendSelectRecipient {...mockScreenProps({})} />
      </Provider>
    )
    const searchInput = getByTestId('SendSelectRecipientSearchInput')

    await act(() => {
      fireEvent.changeText(searchInput, mockE164Number3)
    })
    await act(() => {
      fireEvent.press(getByTestId('RecipientItem'))
    })

    expect(AppAnalytics.track).toHaveBeenCalledWith(SendEvents.send_select_recipient_send_press, {
      recipientType: RecipientType.PhoneNumber,
    })
    expect(navigate).toHaveBeenCalledWith(Screens.SendEnterAmount, {
      isFromScan: false,
      defaultTokenIdOverride: undefined,
      forceTokenId: undefined,
      recipient: {
        address: mockAccount3,
        displayNumber: '(415) 555-0123',
        e164PhoneNumber: mockE164Number3,
        recipientType: 'PhoneNumber',
      },
      origin: SendOrigin.AppSendFlow,
      isMiniPayRecipient: false,
    })
  })
  it('navigates with isMiniPayRecipient when address is verified by minipay', async () => {
    const store = createMockStore({
      ...storeWithPhoneVerified,
      identity: {
        e164NumberToAddress: { [mockE164Number3]: [mockAccount3] },
        addressToVerifiedBy: { [mockAccount3]: 'minipay' },
      },
    })

    const { getByTestId } = render(
      <Provider store={store}>
        <SendSelectRecipient {...mockScreenProps({})} />
      </Provider>
    )
    const searchInput = getByTestId('SendSelectRecipientSearchInput')

    await act(() => {
      fireEvent.changeText(searchInput, mockE164Number3)
    })
    await act(() => {
      fireEvent.press(getByTestId('RecipientItem'))
    })

    expect(navigate).toHaveBeenCalledWith(Screens.SendEnterAmount, {
      isFromScan: false,
      defaultTokenIdOverride: undefined,
      forceTokenId: undefined,
      recipient: {
        address: mockAccount3,
        displayNumber: '(415) 555-0123',
        e164PhoneNumber: mockE164Number3,
        recipientType: 'PhoneNumber',
      },
      origin: SendOrigin.AppSendFlow,
      isMiniPayRecipient: true,
    })
  })
  it('navigates to address picker when phone number recipient has multiple verified addresses', async () => {
    const store = createMockStore({
      ...storeWithPhoneVerified,
      identity: {
        e164NumberToAddress: {
          [mockE164Number3]: [mockAccount2.toLowerCase(), mockAccount3.toLowerCase()],
        },
        addressToE164Number: {
          [mockAccount2.toLowerCase()]: mockE164Number3,
          [mockAccount3.toLowerCase()]: mockE164Number3,
        },
        addressToVerifiedBy: {
          [mockAccount2.toLowerCase()]: 'valora',
          [mockAccount3.toLowerCase()]: 'minipay',
        },
      },
    })

    const { getByTestId } = render(
      <Provider store={store}>
        <SendSelectRecipient {...mockScreenProps({})} />
      </Provider>
    )
    const searchInput = getByTestId('SendSelectRecipientSearchInput')

    await act(() => {
      fireEvent.changeText(searchInput, mockE164Number3)
    })
    await act(() => {
      fireEvent.press(getByTestId('RecipientItem'))
    })

    expect(AppAnalytics.track).toHaveBeenCalledWith(SendEvents.send_select_recipient_send_press, {
      recipientType: RecipientType.PhoneNumber,
    })
    expect(navigate).toHaveBeenCalledWith(Screens.SelectRecipientAddress, {
      defaultTokenIdOverride: undefined,
      forceTokenId: undefined,
      recipient: expect.any(Object),
      origin: SendOrigin.AppSendFlow,
    })
  })
  it('navigates to send enter amount when phone number has multiple raw addresses but only one with a verifier', async () => {
    const store = createMockStore({
      ...storeWithPhoneVerified,
      identity: {
        e164NumberToAddress: {
          [mockE164Number3]: [mockAccount2.toLowerCase(), mockAccount3.toLowerCase()],
        },
        addressToE164Number: {
          [mockAccount2.toLowerCase()]: mockE164Number3,
          [mockAccount3.toLowerCase()]: mockE164Number3,
        },
        addressToVerifiedBy: {
          [mockAccount3.toLowerCase()]: 'valora',
        },
      },
    })

    const { getByTestId } = render(
      <Provider store={store}>
        <SendSelectRecipient {...mockScreenProps({})} />
      </Provider>
    )
    const searchInput = getByTestId('SendSelectRecipientSearchInput')

    await act(() => {
      fireEvent.changeText(searchInput, mockE164Number3)
    })
    await act(() => {
      fireEvent.press(getByTestId('RecipientItem'))
    })

    expect(AppAnalytics.track).toHaveBeenCalledWith(SendEvents.send_select_recipient_send_press, {
      recipientType: RecipientType.PhoneNumber,
    })
    expect(navigate).toHaveBeenCalledWith(Screens.SendEnterAmount, {
      isFromScan: false,
      defaultTokenIdOverride: undefined,
      forceTokenId: undefined,
      recipient: {
        address: mockAccount3.toLowerCase(),
        displayNumber: '(415) 555-0123',
        e164PhoneNumber: mockE164Number3,
        recipientType: 'PhoneNumber',
      },
      origin: SendOrigin.AppSendFlow,
      isMiniPayRecipient: false,
    })
  })
  it.each([{ searchAddress: mockAccount2 }, { searchAddress: mockAccount3 }])(
    'navigates to send enter amount with correct address if an address is entered which also maps to a phone number with multiple addresses',
    async ({ searchAddress }) => {
      const store = createMockStore({
        ...storeWithPhoneVerified,
        identity: {
          e164NumberToAddress: {
            [mockE164Number3]: [mockAccount2.toLowerCase(), mockAccount3.toLowerCase()],
          },
          addressToE164Number: {
            [mockAccount2.toLowerCase()]: mockE164Number3,
            [mockAccount3.toLowerCase()]: mockE164Number3,
          },
          addressToVerifiedBy: {
            [mockAccount2.toLowerCase()]: 'valora',
            [mockAccount3.toLowerCase()]: 'minipay',
          },
        },
      })

      const { getByTestId } = render(
        <Provider store={store}>
          <SendSelectRecipient {...mockScreenProps({})} />
        </Provider>
      )
      const searchInput = getByTestId('SendSelectRecipientSearchInput')

      await act(() => {
        fireEvent.changeText(searchInput, searchAddress)
      })
      await act(() => {
        fireEvent.press(getByTestId('RecipientItem'))
      })

      expect(AppAnalytics.track).toHaveBeenCalledWith(SendEvents.send_select_recipient_send_press, {
        recipientType: RecipientType.Address,
      })
      expect(navigate).toHaveBeenCalledWith(Screens.SendEnterAmount, {
        isFromScan: false,
        defaultTokenIdOverride: undefined,
        forceTokenId: undefined,
        recipient: {
          address: searchAddress.toLowerCase(),
          e164PhoneNumber: mockE164Number3,
          recipientType: RecipientType.Address,
          contactId: undefined,
          displayNumber: undefined,
          name: undefined,
          thumbnailPath: undefined,
        },
        origin: SendOrigin.AppSendFlow,
        isMiniPayRecipient: searchAddress.toLowerCase() === mockAccount3.toLowerCase(),
      })
    }
  )
})
