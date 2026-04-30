import {
  AddressToDisplayNameType,
  AddressToE164NumberType,
  AddressToVerifiedByType,
  E164NumberToAddressType,
} from 'src/identity/reducer'
import { ImportContactsStatus } from 'src/identity/types'

export enum Actions {
  UPDATE_E164_PHONE_NUMBER_ADDRESSES = 'IDENTITY/UPDATE_E164_PHONE_NUMBER_ADDRESSES',
  UPDATE_KNOWN_ADDRESSES = 'IDENTITY/UPDATE_KNOWN_ADDRESSES',
  FETCH_ADDRESSES_AND_VALIDATION_STATUS = 'IDENTITY/FETCH_ADDRESSES_AND_VALIDATION_STATUS',
  IMPORT_CONTACTS = 'IDENTITY/IMPORT_CONTACTS',
  UPDATE_IMPORT_CONTACT_PROGRESS = 'IDENTITY/UPDATE_IMPORT_CONTACT_PROGRESS',
  CANCEL_IMPORT_CONTACTS = 'IDENTITY/CANCEL_IMPORT_CONTACTS',
  END_IMPORT_CONTACTS = 'IDENTITY/END_IMPORT_CONTACTS',
  FETCH_ADDRESS_VERIFICATION_STATUS = 'IDENTITY/FETCH_ADDRESS_VERIFICATION_STATUS',
  RECIPIENT_LOOKUP_RESOLVED = 'IDENTITY/RECIPIENT_LOOKUP_RESOLVED',
  CONTACTS_SAVED = 'IDENTITY/CONTACTS_SAVED',
  STORED_PASSWORD_REFRESHED = 'IDENTITY/STORED_PASSWORD_REFRESHED',
}

export interface UpdateE164PhoneNumberAddressesAction {
  type: Actions.UPDATE_E164_PHONE_NUMBER_ADDRESSES
  e164NumberToAddress: E164NumberToAddressType
  addressToE164Number: AddressToE164NumberType
  addressToVerifiedBy: AddressToVerifiedByType
}

export interface UpdateKnownAddressesAction {
  type: Actions.UPDATE_KNOWN_ADDRESSES
  knownAddresses: AddressToDisplayNameType
}

export interface FetchAddressesAndValidateAction {
  type: Actions.FETCH_ADDRESSES_AND_VALIDATION_STATUS
  e164Number: string
}

export interface ImportContactsAction {
  type: Actions.IMPORT_CONTACTS
}

export interface UpdateImportContactProgress {
  type: Actions.UPDATE_IMPORT_CONTACT_PROGRESS
  status?: ImportContactsStatus
  current?: number
  total?: number
}

export interface EndImportContactsAction {
  type: Actions.END_IMPORT_CONTACTS
  success: boolean
}

export interface FetchAddressVerificationAction {
  type: Actions.FETCH_ADDRESS_VERIFICATION_STATUS
  address: string
}

interface RecipientLookupResolvedAction {
  type: Actions.RECIPIENT_LOOKUP_RESOLVED
}

interface ContactsSavedAction {
  type: Actions.CONTACTS_SAVED
  hash: string
}

interface StoredPasswordRefreshedAction {
  type: Actions.STORED_PASSWORD_REFRESHED
}

export type ActionTypes =
  | UpdateE164PhoneNumberAddressesAction
  | UpdateKnownAddressesAction
  | ImportContactsAction
  | UpdateImportContactProgress
  | EndImportContactsAction
  | FetchAddressesAndValidateAction
  | FetchAddressVerificationAction
  | RecipientLookupResolvedAction
  | ContactsSavedAction
  | StoredPasswordRefreshedAction

export const fetchAddressesAndValidate = (e164Number: string): FetchAddressesAndValidateAction => ({
  type: Actions.FETCH_ADDRESSES_AND_VALIDATION_STATUS,
  e164Number,
})

export const fetchAddressVerification = (address: string): FetchAddressVerificationAction => ({
  type: Actions.FETCH_ADDRESS_VERIFICATION_STATUS,
  address,
})

export const recipientLookupResolved = (): RecipientLookupResolvedAction => ({
  type: Actions.RECIPIENT_LOOKUP_RESOLVED,
})

export const updateE164PhoneNumberAddresses = (
  e164NumberToAddress: E164NumberToAddressType,
  addressToE164Number: AddressToE164NumberType,
  addressToVerifiedBy: AddressToVerifiedByType = {}
): UpdateE164PhoneNumberAddressesAction => ({
  type: Actions.UPDATE_E164_PHONE_NUMBER_ADDRESSES,
  e164NumberToAddress,
  addressToE164Number,
  addressToVerifiedBy,
})

export const updateKnownAddresses = (
  addresses: AddressToDisplayNameType
): UpdateKnownAddressesAction => ({
  type: Actions.UPDATE_KNOWN_ADDRESSES,
  knownAddresses: addresses,
})

export const importContacts = (): ImportContactsAction => ({
  type: Actions.IMPORT_CONTACTS,
})

export const updateImportContactsProgress = (
  status?: ImportContactsStatus,
  current?: number,
  total?: number
): UpdateImportContactProgress => ({
  type: Actions.UPDATE_IMPORT_CONTACT_PROGRESS,
  status,
  current,
  total,
})

export const endImportContacts = (success: boolean): EndImportContactsAction => ({
  type: Actions.END_IMPORT_CONTACTS,
  success,
})

export const contactsSaved = (hash: string): ContactsSavedAction => ({
  type: Actions.CONTACTS_SAVED,
  hash,
})

export const storedPasswordRefreshed = (): StoredPasswordRefreshedAction => ({
  type: Actions.STORED_PASSWORD_REFRESHED,
})
