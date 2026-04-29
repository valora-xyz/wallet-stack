import { Actions, lookupSetLoading } from 'src/identity/actions'
import { reducer } from 'src/identity/reducer'

const initialState = reducer(undefined, { type: 'INIT' } as any)

describe('identity reducer', () => {
  describe(Actions.LOOKUP_SET_LOADING, () => {
    it('marks a phone number as loading', () => {
      const next = reducer(initialState, lookupSetLoading('phoneNumber', '+15551234567', true))
      expect(next.lookupLoading).toEqual({
        phoneNumber: { '+15551234567': true },
        address: {},
      })
    })

    it('marks an address as loading', () => {
      const next = reducer(initialState, lookupSetLoading('address', '0xabc', true))
      expect(next.lookupLoading).toEqual({
        phoneNumber: {},
        address: { '0xabc': true },
      })
    })

    it('clears the loading flag for a single key without touching others', () => {
      const loadingState = {
        ...initialState,
        lookupLoading: {
          phoneNumber: { '+15551234567': true, '+15559999999': true },
          address: { '0xabc': true },
        },
      }
      const next = reducer(loadingState, lookupSetLoading('phoneNumber', '+15551234567', false))
      expect(next.lookupLoading).toEqual({
        phoneNumber: { '+15551234567': false, '+15559999999': true },
        address: { '0xabc': true },
      })
    })

    it('keeps the two kinds isolated when updating one', () => {
      const loadingState = {
        ...initialState,
        lookupLoading: {
          phoneNumber: { '+15551234567': true },
          address: {},
        },
      }
      const next = reducer(loadingState, lookupSetLoading('address', '0xabc', true))
      expect(next.lookupLoading).toEqual({
        phoneNumber: { '+15551234567': true },
        address: { '0xabc': true },
      })
    })
  })
})
