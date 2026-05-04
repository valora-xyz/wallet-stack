import { RootState } from 'src/redux/reducers'

export const e164NumberToAddressSelector = (state: RootState) => state.identity.e164NumberToAddress
export const addressToE164NumberSelector = (state: RootState) => state.identity.addressToE164Number
export const addressToVerifiedBySelector = (state: RootState) => state.identity.addressToVerifiedBy
export const recipientLookupLoadingSelector = (state: RootState) =>
  state.identity.recipientLookupLoading
export const importContactsProgressSelector = (state: RootState) =>
  state.identity.importContactsProgress
export const addressToDisplayNameSelector = (state: RootState) =>
  state.identity.addressToDisplayName
export const lastSavedContactsHashSelector = (state: RootState) =>
  state.identity.lastSavedContactsHash
export const shouldRefreshStoredPasswordHashSelector = (state: RootState) =>
  state.identity.shouldRefreshStoredPasswordHash
