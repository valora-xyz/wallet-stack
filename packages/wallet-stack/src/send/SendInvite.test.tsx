import { act, fireEvent, render } from '@testing-library/react-native'
import * as React from 'react'
import Share from 'react-native-share'
import { Provider } from 'react-redux'
import { showError } from 'src/alert/actions'
import AppAnalytics from 'src/analytics/AppAnalytics'
import { SendEvents } from 'src/analytics/Events'
import { ErrorMessages } from 'src/app/ErrorMessages'
import { getAppConfig } from 'src/appConfig'
import { Screens } from 'src/navigator/Screens'
import { RecipientType } from 'src/recipients/recipient'
import SendInvite from 'src/send/SendInvite'
import { createMockStore, getMockStackScreenProps } from 'test/utils'
import { mockInvitableRecipient3 } from 'test/values'

const shareUrl = 'https://example.test/invite'

const mockScreenProps = () =>
  getMockStackScreenProps(Screens.SendInvite, { recipient: mockInvitableRecipient3 })

describe('SendInvite', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(getAppConfig).mockReturnValue({
      displayName: 'Test App',
      deepLinkUrlScheme: 'testapp',
      registryName: 'test',
      experimental: {
        phoneNumberVerification: true,
        inviteFriends: { shareUrl },
      },
    })
  })

  it('opens the share sheet, tracks the press analytic, and stays on the screen after the sheet closes', async () => {
    jest
      .mocked(Share.open)
      .mockResolvedValueOnce({ success: true, dismissedAction: false, message: '' })

    const store = createMockStore({})
    const { getByTestId } = render(
      <Provider store={store}>
        <SendInvite {...mockScreenProps()} />
      </Provider>
    )

    await act(async () => {
      fireEvent.press(getByTestId('SendInvite/ShareButton'))
    })

    expect(AppAnalytics.track).toHaveBeenCalledWith(SendEvents.send_select_recipient_invite_press, {
      recipientType: RecipientType.PhoneNumber,
    })
    expect(Share.open).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining(shareUrl),
        url: shareUrl,
        failOnCancel: false,
      })
    )
  })

  it('dispatches an error toast when the share sheet fails', async () => {
    jest.mocked(Share.open).mockRejectedValueOnce(new Error('no share providers'))

    const store = createMockStore({})
    const { getByTestId } = render(
      <Provider store={store}>
        <SendInvite {...mockScreenProps()} />
      </Provider>
    )

    await act(async () => {
      fireEvent.press(getByTestId('SendInvite/ShareButton'))
    })

    expect(store.getActions()).toContainEqual(showError(ErrorMessages.SHARE_INVITE_FAILED))
  })

  it('renders the contact name in the title when the recipient has one', () => {
    const store = createMockStore({})
    const { getByText } = render(
      <Provider store={store}>
        <SendInvite {...mockScreenProps()} />
      </Provider>
    )

    expect(
      getByText(`sendInvite.title, {"contact":"${mockInvitableRecipient3.name}"}`)
    ).toBeTruthy()
  })

  it('falls back to the phone number in the title when the recipient has no name', () => {
    const namelessRecipient = {
      displayNumber: mockInvitableRecipient3.displayNumber,
      e164PhoneNumber: mockInvitableRecipient3.e164PhoneNumber,
      recipientType: mockInvitableRecipient3.recipientType,
    }
    const screenProps = getMockStackScreenProps(Screens.SendInvite, {
      recipient: namelessRecipient,
    })
    const store = createMockStore({})
    const { getByText } = render(
      <Provider store={store}>
        <SendInvite {...screenProps} />
      </Provider>
    )

    expect(
      getByText(`sendInvite.title, {"contact":"${mockInvitableRecipient3.displayNumber}"}`)
    ).toBeTruthy()
  })
})
