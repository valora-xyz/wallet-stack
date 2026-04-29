import { act, renderHook } from '@testing-library/react-native'
import * as React from 'react'
import { Provider } from 'react-redux'
import { fetchAddressVerification, fetchAddressesAndValidate } from 'src/identity/actions'
import { RecipientVerificationStatus } from 'src/identity/types'
import { Recipient, RecipientType } from 'src/recipients/recipient'
import useFetchRecipientVerificationStatus from 'src/send/useFetchRecipientVerificationStatus'
import { createMockStore } from 'test/utils'
import { mockAccount, mockE164Number, mockName } from 'test/values'

const phoneRecipient: Recipient = {
  name: mockName,
  contactId: 'contactId',
  e164PhoneNumber: mockE164Number,
  recipientType: RecipientType.PhoneNumber,
}

const addressRecipient: Recipient = {
  address: mockAccount,
  recipientType: RecipientType.Address,
}

function setupHook(
  storeOverrides: Parameters<typeof createMockStore>[0] = {},
  beforeMount?: () => void
) {
  const store = createMockStore(storeOverrides)
  store.dispatch = jest.fn(store.dispatch)
  if (beforeMount) beforeMount()
  const { result, rerender } = renderHook(() => useFetchRecipientVerificationStatus(), {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    ),
  })
  return { result, rerender, store }
}

describe('useFetchRecipientVerificationStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('starts with no recipient and not loading', () => {
    const { result } = setupHook()
    expect(result.current.recipient).toBeNull()
    expect(result.current.recipientVerificationStatus).toBe(RecipientVerificationStatus.UNKNOWN)
    expect(result.current.isSelectedRecipientLoading).toBe(false)
  })

  describe('phone-number recipient', () => {
    it('dispatches fetchAddressesAndValidate when selected', () => {
      const { result, store } = setupHook()
      act(() => {
        result.current.setSelectedRecipient(phoneRecipient)
      })
      expect(store.dispatch).toHaveBeenCalledWith(fetchAddressesAndValidate(mockE164Number))
    })

    it('reports loading while phoneNumberLookupLoading[phone] is true', () => {
      const { result } = setupHook({
        identity: { lookupLoading: { phoneNumber: { [mockE164Number]: true }, address: {} } },
      })
      act(() => {
        result.current.setSelectedRecipient(phoneRecipient)
      })
      expect(result.current.isSelectedRecipientLoading).toBe(true)
    })

    it('stops loading when phoneNumberLookupLoading[phone] becomes false (success)', () => {
      const { result } = setupHook({
        identity: {
          lookupLoading: { phoneNumber: { [mockE164Number]: false }, address: {} },
          e164NumberToAddress: { [mockE164Number]: [mockAccount] },
        },
      })
      act(() => {
        result.current.setSelectedRecipient(phoneRecipient)
      })
      expect(result.current.isSelectedRecipientLoading).toBe(false)
    })

    it('stops loading once phoneNumberLookupLoading[phone] is false (saga finished, success or error)', () => {
      // Mirrors the saga's `finally` branch: the loading flag clears regardless of whether the
      // request succeeded, so the picker spinner should stop. We override the cached mapping to
      // empty here to make sure loading state is not tied to whether mapping data arrived.
      const { result } = setupHook({
        identity: {
          lookupLoading: { phoneNumber: { [mockE164Number]: false }, address: {} },
          e164NumberToAddress: {},
        },
      })
      act(() => {
        result.current.setSelectedRecipient(phoneRecipient)
      })
      expect(result.current.isSelectedRecipientLoading).toBe(false)
    })
  })

  describe('address recipient', () => {
    it('dispatches fetchAddressVerification when phone is verified', () => {
      const { result, store } = setupHook({
        app: { phoneNumberVerified: true },
      })
      act(() => {
        result.current.setSelectedRecipient(addressRecipient)
      })
      expect(store.dispatch).toHaveBeenCalledWith(fetchAddressVerification(mockAccount))
    })

    it('marks address recipient as unverified when phone is not verified', () => {
      const { result } = setupHook({ app: { phoneNumberVerified: false } })
      act(() => {
        result.current.setSelectedRecipient(addressRecipient)
      })
      expect(result.current.recipientVerificationStatus).toBe(
        RecipientVerificationStatus.UNVERIFIED
      )
      expect(result.current.isSelectedRecipientLoading).toBe(false)
    })

    it('reports loading while addressLookupLoading[address] is true', () => {
      const { result } = setupHook({
        app: { phoneNumberVerified: true },
        identity: {
          lookupLoading: { phoneNumber: {}, address: { [mockAccount.toLowerCase()]: true } },
        },
      })
      act(() => {
        result.current.setSelectedRecipient(addressRecipient)
      })
      expect(result.current.isSelectedRecipientLoading).toBe(true)
    })

    it('stops loading once addressLookupLoading[address] is false (saga finished, success or error)', () => {
      const { result } = setupHook({
        app: { phoneNumberVerified: true },
        identity: {
          lookupLoading: { phoneNumber: {}, address: { [mockAccount.toLowerCase()]: false } },
        },
      })
      act(() => {
        result.current.setSelectedRecipient(addressRecipient)
      })
      expect(result.current.isSelectedRecipientLoading).toBe(false)
    })
  })

  it('clears recipient and verification status on unset', () => {
    const { result } = setupHook({
      identity: { lookupLoading: { phoneNumber: { [mockE164Number]: true }, address: {} } },
    })
    act(() => {
      result.current.setSelectedRecipient(phoneRecipient)
    })
    act(() => {
      result.current.unsetSelectedRecipient()
    })
    expect(result.current.recipient).toBeNull()
    expect(result.current.recipientVerificationStatus).toBe(RecipientVerificationStatus.UNKNOWN)
    expect(result.current.isSelectedRecipientLoading).toBe(false)
  })
})
