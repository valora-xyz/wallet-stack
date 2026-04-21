import { fireEvent, render } from '@testing-library/react-native'
import * as React from 'react'
import 'react-native'
import { Provider } from 'react-redux'
import RecipientItem from 'src/recipients/RecipientItemV2'
import { createMockStore } from 'test/utils'
import { mockAddressRecipient, mockInvitableRecipient, mockPhoneRecipient } from 'test/values'

describe('RecipientItemV2', () => {
  it('never renders the verified app icon — verification must be refetched on selection', () => {
    // Even with a populated mapping (default store includes one) we must not surface
    // a cached "verified" indicator on the recipient list.
    const { queryByTestId } = render(
      <Provider store={createMockStore()}>
        <RecipientItem
          recipient={mockInvitableRecipient}
          onSelectRecipient={jest.fn()}
          loading={false}
        />
      </Provider>
    )
    expect(queryByTestId('RecipientItem/AppIcon')).toBeFalsy()
  })

  it('renders contact name and phone number', () => {
    const { getByText } = render(
      <Provider store={createMockStore()}>
        <RecipientItem
          recipient={mockInvitableRecipient}
          onSelectRecipient={jest.fn()}
          loading={false}
        />
      </Provider>
    )
    expect(getByText(mockInvitableRecipient.name)).toBeTruthy()
    expect(getByText(mockInvitableRecipient.displayNumber)).toBeTruthy()
  })

  it('renders spinner while loading', () => {
    const { getByTestId } = render(
      <Provider store={createMockStore()}>
        <RecipientItem
          recipient={mockInvitableRecipient}
          onSelectRecipient={jest.fn()}
          loading={true}
        />
      </Provider>
    )
    expect(getByTestId('RecipientItem/ActivityIndicator')).toBeTruthy()
  })

  it('hides spinner when not loading', () => {
    const { queryByTestId } = render(
      <Provider store={createMockStore()}>
        <RecipientItem
          recipient={mockInvitableRecipient}
          onSelectRecipient={jest.fn()}
          loading={false}
        />
      </Provider>
    )
    expect(queryByTestId('RecipientItem/ActivityIndicator')).toBeFalsy()
  })

  it('tapping item invokes onSelectRecipient', () => {
    const mockSelectRecipient = jest.fn()
    const { getByTestId } = render(
      <Provider store={createMockStore()}>
        <RecipientItem
          recipient={mockInvitableRecipient}
          onSelectRecipient={mockSelectRecipient}
          loading={false}
        />
      </Provider>
    )
    fireEvent.press(getByTestId('RecipientItem'))
    expect(mockSelectRecipient).toHaveBeenLastCalledWith(mockInvitableRecipient)
  })

  it('renders correct icon when recipient is a phone number', () => {
    const { queryByTestId, getByTestId } = render(
      <Provider store={createMockStore()}>
        <RecipientItem
          recipient={mockPhoneRecipient}
          onSelectRecipient={jest.fn()}
          loading={false}
        />
      </Provider>
    )
    expect(getByTestId('RecipientItem/PhoneIcon')).toBeTruthy()
    expect(queryByTestId('RecipientItem/WalletIcon')).toBeFalsy()
  })

  it('renders correct icon when recipient is an address', () => {
    const { queryByTestId, getByTestId } = render(
      <Provider store={createMockStore()}>
        <RecipientItem
          recipient={mockAddressRecipient}
          onSelectRecipient={jest.fn()}
          loading={false}
        />
      </Provider>
    )
    expect(getByTestId('RecipientItem/WalletIcon')).toBeTruthy()
    expect(queryByTestId('RecipientItem/PhoneIcon')).toBeFalsy()
  })
})
