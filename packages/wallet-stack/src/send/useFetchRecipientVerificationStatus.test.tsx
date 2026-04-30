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

    it('reports loading while recipientLookupLoading is true', () => {
      const { result } = setupHook({
        identity: { recipientLookupLoading: true },
      })
      act(() => {
        result.current.setSelectedRecipient(phoneRecipient)
      })
      expect(result.current.isSelectedRecipientLoading).toBe(true)
    })

    it('stops loading when recipientLookupLoading becomes false (saga finished, success or error)', () => {
      // Mirrors the saga's `finally` branch: the loading flag clears regardless of whether the
      // request succeeded, so the picker spinner should stop.
      const { result } = setupHook({
        identity: {
          recipientLookupLoading: false,
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

    it('reports loading while recipientLookupLoading is true', () => {
      const { result } = setupHook({
        app: { phoneNumberVerified: true },
        identity: { recipientLookupLoading: true },
      })
      act(() => {
        result.current.setSelectedRecipient(addressRecipient)
      })
      expect(result.current.isSelectedRecipientLoading).toBe(true)
    })

    it('stops loading once recipientLookupLoading is false (saga finished, success or error)', () => {
      const { result } = setupHook({
        app: { phoneNumberVerified: true },
        identity: { recipientLookupLoading: false },
      })
      act(() => {
        result.current.setSelectedRecipient(addressRecipient)
      })
      expect(result.current.isSelectedRecipientLoading).toBe(false)
    })
  })

  it('clears recipient and verification status on unset', () => {
    const { result } = setupHook({
      identity: { recipientLookupLoading: true },
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
