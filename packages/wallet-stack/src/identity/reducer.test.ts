import {
  Actions,
  fetchAddressVerification,
  fetchAddressesAndValidate,
  recipientLookupResolved,
} from 'src/identity/actions'
import { reducer } from 'src/identity/reducer'

const initialState = reducer(undefined, { type: 'INIT' } as any)

describe('identity reducer', () => {
  describe('recipientLookupLoading', () => {
    it(`is set true on ${Actions.FETCH_ADDRESSES_AND_VALIDATION_STATUS}`, () => {
      const next = reducer(initialState, fetchAddressesAndValidate('+15551234567'))
      expect(next.recipientLookupLoading).toBe(true)
    })

    it(`is set true on ${Actions.FETCH_ADDRESS_VERIFICATION_STATUS}`, () => {
      const next = reducer(initialState, fetchAddressVerification('0xabc'))
      expect(next.recipientLookupLoading).toBe(true)
    })

    it(`is cleared on ${Actions.RECIPIENT_LOOKUP_RESOLVED}`, () => {
      const loadingState = { ...initialState, recipientLookupLoading: true }
      const next = reducer(loadingState, recipientLookupResolved())
      expect(next.recipientLookupLoading).toBe(false)
    })
  })
})
