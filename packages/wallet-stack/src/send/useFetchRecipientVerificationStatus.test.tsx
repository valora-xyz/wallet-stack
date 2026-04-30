import { act, renderHook } from '@testing-library/react-native'
import * as React from 'react'
import { Provider } from 'react-redux'
import {
  fetchAddressVerification,
  fetchAddressesAndValidate,
  recipientLookupResolved,
} from 'src/identity/actions'
import { RecipientVerificationStatus } from 'src/identity/types'
import { Recipient, RecipientType } from 'src/recipients/recipient'
import { setupStore } from 'src/redux/store'
import useFetchRecipientVerificationStatus from 'src/send/useFetchRecipientVerificationStatus'
import { getMockStoreData } from 'test/utils'
import { mockAccount, mockE164Number, mockName } from 'test/values'

jest.mock('src/redux/sagas', () => ({
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  rootSaga: jest.fn(function* () {}),
}))

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

function setupHook(storeOverrides: Parameters<typeof getMockStoreData>[0] = {}) {
  const { store } = setupStore(getMockStoreData(storeOverrides))
  const dispatchSpy = jest.spyOn(store, 'dispatch')
  const { result, rerender } = renderHook(() => useFetchRecipientVerificationStatus(), {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    ),
  })
  return { result, rerender, store, dispatchSpy }
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
      const { result, dispatchSpy } = setupHook()
      act(() => {
        result.current.setSelectedRecipient(phoneRecipient)
      })
      expect(dispatchSpy).toHaveBeenCalledWith(fetchAddressesAndValidate(mockE164Number))
    })

    it('reports loading once the lookup is dispatched and stops once it resolves', () => {
      const { result, store } = setupHook()

      act(() => {
        result.current.setSelectedRecipient(phoneRecipient)
      })
      expect(result.current.isSelectedRecipientLoading).toBe(true)

      act(() => {
        store.dispatch(recipientLookupResolved())
      })
      expect(result.current.isSelectedRecipientLoading).toBe(false)
    })
  })

  describe('address recipient', () => {
    it('dispatches fetchAddressVerification when phone is verified', () => {
      const { result, dispatchSpy } = setupHook({
        app: { phoneNumberVerified: true },
      })
      act(() => {
        result.current.setSelectedRecipient(addressRecipient)
      })
      expect(dispatchSpy).toHaveBeenCalledWith(fetchAddressVerification(mockAccount))
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

    it('reports loading once the lookup is dispatched and stops once it resolves', () => {
      const { result, store } = setupHook({ app: { phoneNumberVerified: true } })

      act(() => {
        result.current.setSelectedRecipient(addressRecipient)
      })
      expect(result.current.isSelectedRecipientLoading).toBe(true)

      act(() => {
        store.dispatch(recipientLookupResolved())
      })
      expect(result.current.isSelectedRecipientLoading).toBe(false)
    })
  })

  it('clears recipient and verification status on unset', () => {
    const { result } = setupHook()
    act(() => {
      result.current.setSelectedRecipient(phoneRecipient)
    })
    expect(result.current.isSelectedRecipientLoading).toBe(true)

    act(() => {
      result.current.unsetSelectedRecipient()
    })
    expect(result.current.recipient).toBeNull()
    expect(result.current.recipientVerificationStatus).toBe(RecipientVerificationStatus.UNKNOWN)
    expect(result.current.isSelectedRecipientLoading).toBe(false)
  })
})
