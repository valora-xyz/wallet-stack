import { fireEvent, render } from '@testing-library/react-native'
import * as React from 'react'
import { Provider } from 'react-redux'
import AppAnalytics from 'src/analytics/AppAnalytics'
import { SendEvents } from 'src/analytics/Events'
import { SendOrigin } from 'src/analytics/types'
import { navigate } from 'src/navigator/NavigationService'
import { Screens } from 'src/navigator/Screens'
import { RecipientType } from 'src/recipients/recipient'
import SelectRecipientAddress from 'src/send/SelectRecipientAddress'
import { createMockStore, getMockStackScreenProps } from 'test/utils'
import { mockAccount2, mockAccount3, mockE164Number3 } from 'test/values'

const mockRecipient = {
  e164PhoneNumber: mockE164Number3,
  displayNumber: '(415) 555-0123',
  recipientType: RecipientType.PhoneNumber,
} as const

function renderScreen(storeOverrides: any) {
  const store = createMockStore({
    identity: {
      e164NumberToAddress: {
        [mockE164Number3]: [mockAccount2.toLowerCase(), mockAccount3.toLowerCase()],
      },
      addressToVerifiedBy: {
        [mockAccount2.toLowerCase()]: 'valora',
        [mockAccount3.toLowerCase()]: 'minipay',
      },
      ...storeOverrides?.identity,
    },
  })

  const props = getMockStackScreenProps(Screens.SelectRecipientAddress, {
    recipient: mockRecipient,
    origin: SendOrigin.AppSendFlow,
  })

  return render(
    <Provider store={store}>
      <SelectRecipientAddress {...props} />
    </Provider>
  )
}

describe('SelectRecipientAddress', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders a row per verified address with its verifier label', () => {
    const { getByText, getByTestId } = renderScreen({})

    expect(getByTestId(`SelectRecipientAddress/Row/${mockAccount2.toLowerCase()}`)).toBeTruthy()
    expect(getByTestId(`SelectRecipientAddress/Row/${mockAccount3.toLowerCase()}`)).toBeTruthy()
    expect(getByText('Valora')).toBeTruthy()
    expect(getByText('MiniPay')).toBeTruthy()
    expect(
      getByText(`selectRecipientAddress.explanation, {"name":"${mockRecipient.displayNumber}"}`)
    ).toBeTruthy()
  })

  it('tracks the screen-open event with the number of verified addresses', () => {
    renderScreen({})

    expect(AppAnalytics.track).toHaveBeenCalledWith(SendEvents.send_select_recipient_address_open, {
      addressCount: 2,
    })
  })

  it('filters out addresses without a verifier entry', () => {
    const { queryByTestId } = renderScreen({
      identity: {
        e164NumberToAddress: {
          [mockE164Number3]: [mockAccount2.toLowerCase(), mockAccount3.toLowerCase()],
        },
        addressToVerifiedBy: {
          [mockAccount2.toLowerCase()]: 'valora',
          // mockAccount3 intentionally omitted
        },
      },
    })

    expect(queryByTestId(`SelectRecipientAddress/Row/${mockAccount2.toLowerCase()}`)).toBeTruthy()
    expect(queryByTestId(`SelectRecipientAddress/Row/${mockAccount3.toLowerCase()}`)).toBeNull()
  })

  it('filters out addresses with an unknown verifier', () => {
    const { queryByTestId } = renderScreen({
      identity: {
        e164NumberToAddress: {
          [mockE164Number3]: [mockAccount2.toLowerCase(), mockAccount3.toLowerCase()],
        },
        addressToVerifiedBy: {
          [mockAccount2.toLowerCase()]: 'valora',
          [mockAccount3.toLowerCase()]: 'somethingNew',
        },
      },
    })

    expect(queryByTestId(`SelectRecipientAddress/Row/${mockAccount2.toLowerCase()}`)).toBeTruthy()
    expect(queryByTestId(`SelectRecipientAddress/Row/${mockAccount3.toLowerCase()}`)).toBeNull()
  })

  it('navigates to SendEnterAmount on Valora row tap', () => {
    const { getByTestId } = renderScreen({})
    fireEvent.press(getByTestId(`SelectRecipientAddress/Row/${mockAccount2.toLowerCase()}`))

    expect(navigate).toHaveBeenCalledWith(Screens.SendEnterAmount, {
      isFromScan: false,
      defaultTokenIdOverride: undefined,
      forceTokenId: undefined,
      recipient: {
        ...mockRecipient,
        address: mockAccount2.toLowerCase(),
      },
      origin: SendOrigin.AppSendFlow,
      skipRecipientLookup: true,
    })
    expect(AppAnalytics.track).toHaveBeenCalledWith(
      SendEvents.send_select_recipient_address_select,
      { verifier: 'valora' }
    )
  })

  it('navigates to SendEnterAmount on MiniPay row tap', () => {
    const { getByTestId } = renderScreen({})
    fireEvent.press(getByTestId(`SelectRecipientAddress/Row/${mockAccount3.toLowerCase()}`))

    expect(navigate).toHaveBeenCalledWith(Screens.SendEnterAmount, {
      isFromScan: false,
      defaultTokenIdOverride: undefined,
      forceTokenId: undefined,
      recipient: {
        ...mockRecipient,
        address: mockAccount3.toLowerCase(),
      },
      origin: SendOrigin.AppSendFlow,
      skipRecipientLookup: true,
    })
    expect(AppAnalytics.track).toHaveBeenCalledWith(
      SendEvents.send_select_recipient_address_select,
      { verifier: 'minipay' }
    )
  })
})
