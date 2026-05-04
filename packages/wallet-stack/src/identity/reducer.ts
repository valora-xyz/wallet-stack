import { RehydrateAction } from 'redux-persist'
import { Actions as AccountActions, ClearStoredAccountAction } from 'src/account/actions'
import { ActionTypes, Actions } from 'src/identity/actions'
import { ImportContactsStatus } from 'src/identity/types'
import { REHYDRATE, getRehydratePayload } from 'src/redux/persist-helper'

export interface AddressToE164NumberType {
  [address: string]: string | null
}

export interface E164NumberToAddressType {
  [e164PhoneNumber: string]: string[] | null | undefined // null means unverified
}

export interface AddressInfoToDisplay {
  name: string
  imageUrl: string | null
  isCeloRewardSender?: boolean
  isProviderAddress?: boolean
}

// This mapping is just for storing provider info from firebase
// other known recipient should be stored in the appRecipientCache
export interface AddressToDisplayNameType {
  [address: string]: AddressInfoToDisplay | undefined
}

export interface ImportContactProgress {
  status: ImportContactsStatus
  current: number
  total: number
}

export interface AddressToVerifiedByType {
  // undefined = never checked / unknown
  // null      = checked, no known verifier
  // string    = checked, verified by that verifier (e.g. "valora", "minipay")
  [address: string]: string | null | undefined
}

interface State {
  addressToE164Number: AddressToE164NumberType
  // Note: Do not access values in this directly, use the `getAddressFromPhoneNumber` helper in contactMapping
  e164NumberToAddress: E164NumberToAddressType
  // Doesn't contain all known addresses, use only as a fallback.
  addressToDisplayName: AddressToDisplayNameType
  // Has the user already been asked for contacts permission
  askedContactsPermission: boolean
  importContactsProgress: ImportContactProgress
  // Mapping of address to the entity that verified it (e.g. "valora", "minipay")
  addressToVerifiedBy: AddressToVerifiedByType
  // Single boolean is safe because both lookup sagas use `takeLatest` — at most one in flight.
  recipientLookupLoading: boolean
  lastSavedContactsHash: string | null
  shouldRefreshStoredPasswordHash: boolean
}

const initialState: State = {
  addressToE164Number: {},
  e164NumberToAddress: {},
  addressToDisplayName: {},
  askedContactsPermission: false,
  importContactsProgress: {
    status: ImportContactsStatus.Stopped,
    current: 0,
    total: 0,
  },
  addressToVerifiedBy: {},
  recipientLookupLoading: false,
  lastSavedContactsHash: null,
  shouldRefreshStoredPasswordHash: false,
}

export const reducer = (
  state: State | undefined = initialState,
  action: ActionTypes | RehydrateAction | ClearStoredAccountAction
): State => {
  switch (action.type) {
    case REHYDRATE: {
      // Ignore some persisted properties
      const rehydratedState = getRehydratePayload(action, 'identity')

      return {
        ...state,
        ...rehydratedState,
        importContactsProgress: {
          status: ImportContactsStatus.Stopped,
          current: 0,
          total: 0,
        },
        recipientLookupLoading: false,
      }
    }
    case Actions.UPDATE_E164_PHONE_NUMBER_ADDRESSES:
      return {
        ...state,
        addressToE164Number: { ...state.addressToE164Number, ...action.addressToE164Number },
        e164NumberToAddress: {
          ...state.e164NumberToAddress,
          ...action.e164NumberToAddress,
        },
        addressToVerifiedBy: {
          ...state.addressToVerifiedBy,
          ...action.addressToVerifiedBy,
        },
      }
    case Actions.UPDATE_KNOWN_ADDRESSES:
      return {
        ...state,
        addressToDisplayName: {
          ...state.addressToDisplayName,
          ...action.knownAddresses,
        },
      }
    case Actions.IMPORT_CONTACTS:
      return {
        ...state,
        askedContactsPermission: true,
        importContactsProgress: { status: ImportContactsStatus.Prepping, current: 0, total: 0 },
      }
    case Actions.UPDATE_IMPORT_CONTACT_PROGRESS:
      const curProgress = state.importContactsProgress
      return {
        ...state,
        importContactsProgress: {
          current: action.current ?? curProgress.current,
          total: action.total ?? curProgress.total,
          status: action.status ?? curProgress.status,
        },
      }
    case Actions.END_IMPORT_CONTACTS:
      const { success } = action
      return {
        ...state,
        importContactsProgress: {
          ...state.importContactsProgress,
          status: success ? ImportContactsStatus.Done : ImportContactsStatus.Failed,
        },
      }
    case AccountActions.CLEAR_STORED_ACCOUNT:
      return {
        ...initialState,
        addressToE164Number: state.addressToE164Number,
        e164NumberToAddress: state.e164NumberToAddress,
      }
    case Actions.FETCH_ADDRESSES_AND_VALIDATION_STATUS:
      return {
        ...state,
        recipientLookupLoading: true,
      }
    case Actions.FETCH_ADDRESS_VERIFICATION_STATUS:
      return {
        ...state,
        addressToVerifiedBy: {
          ...state.addressToVerifiedBy,
          [action.address]: undefined,
        },
        recipientLookupLoading: true,
      }
    case Actions.RECIPIENT_LOOKUP_RESOLVED:
      return {
        ...state,
        recipientLookupLoading: false,
      }
    case Actions.CONTACTS_SAVED:
      return {
        ...state,
        lastSavedContactsHash: action.hash,
      }
    case Actions.STORED_PASSWORD_REFRESHED:
      return {
        ...state,
        shouldRefreshStoredPasswordHash: false,
      }
    default:
      return state
  }
}
