import { act, renderHook } from '@testing-library/react-native'
import * as React from 'react'
import { Provider } from 'react-redux'
import {
  fetchAddressVerification,
  fetchAddressesAndValidate,
  recipientLookupResolved,
  updateE164PhoneNumberAddresses,
} from 'src/identity/actions'
import { Recipient, RecipientType } from 'src/recipients/recipient'
import { setupStore } from 'src/redux/store'
import { useRecipientLookup } from 'src/send/useRecipientLookup'
import { getMockStoreData } from 'test/utils'
import { mockAccount, mockAccount2, mockE164Number, mockName } from 'test/values'

jest.mock('src/redux/sagas', () => ({
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  rootSaga: jest.fn(function* () {}),
}))

const phoneRecipient: Recipient & { address: string } = {
  name: mockName,
  contactId: 'contactId',
  e164PhoneNumber: mockE164Number,
  recipientType: RecipientType.PhoneNumber,
  address: mockAccount,
}

const addressRecipient: Recipient & { address: string } = {
  address: mockAccount,
  recipientType: RecipientType.Address,
}

function setupHook(
  recipient: Recipient & { address: string },
  options?: { skipFetch?: boolean },
  storeOverrides: Parameters<typeof getMockStoreData>[0] = {}
) {
  const { store } = setupStore(getMockStoreData(storeOverrides))
  const dispatchSpy = jest.spyOn(store, 'dispatch')
  const { result, rerender } = renderHook(() => useRecipientLookup(recipient, options), {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    ),
  })
  return { result, rerender, store, dispatchSpy }
}

describe('useRecipientLookup', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('dispatches fetchAddressesAndValidate for phone recipients', () => {
    const { dispatchSpy } = setupHook(phoneRecipient)
    expect(dispatchSpy).toHaveBeenCalledWith(fetchAddressesAndValidate(mockE164Number))
  })

  it('dispatches fetchAddressVerification for address-only recipients', () => {
    const { dispatchSpy } = setupHook(addressRecipient)
    expect(dispatchSpy).toHaveBeenCalledWith(fetchAddressVerification(mockAccount.toLowerCase()))
  })

  it('does not dispatch when skipFetch is set (caller already triggered the lookup)', () => {
    const { dispatchSpy } = setupHook(phoneRecipient, { skipFetch: true })
    expect(dispatchSpy).not.toHaveBeenCalledWith(fetchAddressesAndValidate(mockE164Number))
  })

  it('reports loading while the lookup is in flight and resolves to unknown when no verifier is recorded', () => {
    const { result, store } = setupHook(addressRecipient)
    expect(result.current.status).toBe('loading')

    act(() => {
      store.dispatch(recipientLookupResolved())
    })
    expect(result.current.status).toBe('unknown')
  })

  it('returns "unverified" for a phone recipient when the lookup resolved with no verified addresses', () => {
    const { result, store } = setupHook(phoneRecipient, { skipFetch: true })
    act(() => {
      store.dispatch(updateE164PhoneNumberAddresses({ [mockE164Number]: null }, {}))
    })
    expect(result.current.status).toBe('unverified')
  })

  it('returns "verified" when the address has a known verifier', () => {
    const { result } = setupHook(
      addressRecipient,
      { skipFetch: true },
      {
        identity: {
          addressToVerifiedBy: { [mockAccount.toLowerCase()]: 'valora' },
        },
      }
    )
    expect(result.current.status).toBe('verified')
  })

  it('returns "unverified" when the address is known to be unverified (verifier=null)', () => {
    const { result } = setupHook(
      addressRecipient,
      { skipFetch: true },
      {
        identity: {
          addressToVerifiedBy: { [mockAccount.toLowerCase()]: null },
        },
      }
    )
    expect(result.current.status).toBe('unverified')
  })

  it('returns the verified addresses linked to a phone recipient, filtering out unverified ones', () => {
    const { result, store } = setupHook(
      phoneRecipient,
      { skipFetch: true },
      {
        identity: {
          addressToVerifiedBy: {
            [mockAccount.toLowerCase()]: 'valora',
            [mockAccount2.toLowerCase()]: null,
          },
        },
      }
    )
    act(() => {
      store.dispatch(
        updateE164PhoneNumberAddresses(
          { [mockE164Number]: [mockAccount.toLowerCase(), mockAccount2.toLowerCase()] },
          {}
        )
      )
    })

    expect(result.current.verifiedAddresses).toEqual([
      { address: mockAccount.toLowerCase(), verifier: 'valora' },
    ])
  })
})
