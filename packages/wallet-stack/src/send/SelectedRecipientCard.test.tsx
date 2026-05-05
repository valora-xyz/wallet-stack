import { fireEvent, render } from '@testing-library/react-native'
import * as React from 'react'
import { Provider } from 'react-redux'
import { Recipient, RecipientType } from 'src/recipients/recipient'
import SelectedRecipientCard from 'src/send/SelectedRecipientCard'
import { createMockStore } from 'test/utils'
import { mockAccount, mockAccount2, mockE164Number, mockName } from 'test/values'

jest.mock('src/components/BottomSheet', () => {
  const React = require('react')
  const { View } = require('react-native')
  // Render the sheet's children inline so the verified rows are queryable in tests.
  const BottomSheet = React.forwardRef(({ children }: any, _ref: any) =>
    React.createElement(View, { testID: 'BottomSheet' }, children)
  )
  return { __esModule: true, default: BottomSheet }
})

const phoneRecipient = {
  name: mockName,
  e164PhoneNumber: mockE164Number,
  recipientType: RecipientType.PhoneNumber,
  address: mockAccount,
} as Recipient & { address: string }

function renderCard(
  props: Partial<React.ComponentProps<typeof SelectedRecipientCard>> = {},
  storeOverrides: Record<string, unknown> = {}
) {
  const onSelectAddress = jest.fn()
  const utils = render(
    <Provider store={createMockStore(storeOverrides)}>
      <SelectedRecipientCard
        recipient={phoneRecipient}
        status="verified"
        verifiedAddresses={[]}
        originalAddress={phoneRecipient.address}
        onSelectAddress={onSelectAddress}
        {...props}
      />
    </Provider>
  )
  return { ...utils, onSelectAddress }
}

describe('SelectedRecipientCard', () => {
  it('shows the recipient name as the title and a spinner while the lookup is loading', () => {
    const { getByTestId } = renderCard({ status: 'loading' })
    expect(getByTestId('SelectedRecipientCard')).toHaveTextContent(mockName, { exact: false })
    expect(getByTestId('SelectedRecipientCard/Spinner')).toBeTruthy()
  })

  it('shows an unverified warning subtitle when the resolved address is known-unverified', () => {
    const { getByTestId } = renderCard({ status: 'unverified' })
    expect(getByTestId('SelectedRecipientCard/Unverified')).toHaveTextContent('unverifiedAddress', {
      exact: false,
    })
  })

  it('is not tappable when there is only one address option (the current one)', () => {
    const { getByTestId } = renderCard({
      status: 'verified',
      verifiedAddresses: [{ address: mockAccount.toLowerCase(), verifier: 'valora' }],
    })
    const touchable = getByTestId('SelectedRecipientCard/Touchable')
    expect(touchable).toBeDisabled()
  })

  it('opens the sheet and invokes onSelectAddress when tapping a row', () => {
    const { getByTestId, onSelectAddress } = renderCard({
      status: 'verified',
      verifiedAddresses: [
        { address: mockAccount.toLowerCase(), verifier: 'valora' },
        { address: mockAccount2.toLowerCase(), verifier: 'minipay' },
      ],
    })

    fireEvent.press(getByTestId(`SelectRecipientAddress/Row/${mockAccount2.toLowerCase()}`))
    expect(onSelectAddress).toHaveBeenCalledWith(mockAccount2.toLowerCase())
  })

  it('keeps the original (unverified) address selectable in the sheet alongside verified options', () => {
    const { getByTestId, onSelectAddress } = renderCard({
      status: 'verified',
      // Verified set does not include the original address — common after the user picked a
      // verified option from a recipient that came in via recents with a stale mapping.
      verifiedAddresses: [{ address: mockAccount2.toLowerCase(), verifier: 'valora' }],
      originalAddress: mockAccount,
      recipient: { ...phoneRecipient, address: mockAccount2.toLowerCase() },
    })

    // The original (unverified) address still renders as a selectable row.
    fireEvent.press(getByTestId(`SelectRecipientAddress/Row/${mockAccount}`))
    expect(onSelectAddress).toHaveBeenCalledWith(mockAccount)
  })
})
