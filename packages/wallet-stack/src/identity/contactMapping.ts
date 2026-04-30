import { Platform } from 'react-native'
import DeviceInfo from 'react-native-device-info'
import { setUserContactDetails } from 'src/account/actions'
import { defaultCountryCodeSelector, e164NumberSelector } from 'src/account/selectors'
import { showErrorOrFallback } from 'src/alert/actions'
import AppAnalytics from 'src/analytics/AppAnalytics'
import { IdentityEvents } from 'src/analytics/Events'
import { ErrorMessages } from 'src/app/ErrorMessages'
import { phoneNumberVerifiedSelector } from 'src/app/selectors'
import {
  Actions,
  FetchAddressVerificationAction,
  FetchAddressesAndValidateAction,
  contactsSaved,
  endImportContacts,
  recipientLookupResolved,
  updateE164PhoneNumberAddresses,
  updateImportContactsProgress,
} from 'src/identity/actions'
import {
  AddressToE164NumberType,
  AddressToVerifiedByType,
  E164NumberToAddressType,
} from 'src/identity/reducer'
import {
  addressToE164NumberSelector,
  addressToVerifiedBySelector,
  e164NumberToAddressSelector,
  lastSavedContactsHashSelector,
} from 'src/identity/selectors'
import { ImportContactsStatus } from 'src/identity/types'
import { retrieveSignedMessage } from 'src/pincode/authentication'
import { NumberToRecipient, contactsToRecipients } from 'src/recipients/recipient'
import { phoneRecipientCacheSelector, setPhoneRecipientCache } from 'src/recipients/reducer'
import { SentrySpanHub } from 'src/sentry/SentrySpanHub'
import { SentrySpan } from 'src/sentry/SentrySpans'
import { getFeatureGate } from 'src/statsig'
import { StatsigFeatureGates } from 'src/statsig/types'
import Logger from 'src/utils/Logger'
import { getAllContacts, hasGrantedContactsPermission } from 'src/utils/contacts'
import { ensureError } from 'src/utils/ensureError'
import { fetchWithTimeout } from 'src/utils/fetchWithTimeout'
import { calculateSha256Hash } from 'src/utils/random'
import networkConfig from 'src/web3/networkConfig'
import { getConnectedAccount } from 'src/web3/saga'
import { walletAddressSelector } from 'src/web3/selectors'
import { call, delay, put, race, select, spawn, take } from 'typed-redux-saga'

const TAG = 'identity/contactMapping'
export const IMPORT_CONTACTS_TIMEOUT = 1 * 60 * 1000 // 1 minute

export function* doImportContactsWrapper() {
  yield* call(getConnectedAccount)
  try {
    Logger.debug(TAG, 'Importing user contacts')

    const { result, cancel, timeout } = yield* race({
      result: call(doImportContacts),
      cancel: take(Actions.CANCEL_IMPORT_CONTACTS),
      timeout: delay(IMPORT_CONTACTS_TIMEOUT),
    })

    if (result === true) {
      Logger.debug(TAG, 'Import Contacts completed successfully')
    } else if (cancel) {
      Logger.debug(TAG, 'Import Contacts cancelled')
    } else if (timeout) {
      Logger.debug(TAG, 'Import Contacts timed out')
      throw new Error('Import Contacts timed out')
    }

    Logger.debug(TAG, 'Done importing user contacts')
    yield* put(endImportContacts(true))
  } catch (err) {
    const error = ensureError(err)
    Logger.error(TAG, 'Error importing user contacts', error)
    AppAnalytics.track(IdentityEvents.contacts_import_error, { error: error.message })
    yield* put(showErrorOrFallback(error, ErrorMessages.IMPORT_CONTACTS_FAILED))
    yield* put(endImportContacts(false))
  }
}

function* doImportContacts() {
  const contactPermissionStatusGranted = yield* call(hasGrantedContactsPermission)
  if (!contactPermissionStatusGranted) {
    Logger.warn(TAG, 'Contact permissions denied. Skipping import.')
    AppAnalytics.track(IdentityEvents.contacts_import_permission_denied)
    return true
  }

  AppAnalytics.track(IdentityEvents.contacts_import_start)

  SentrySpanHub.startSpan(SentrySpan.import_contacts)
  yield* put(updateImportContactsProgress(ImportContactsStatus.Importing))

  const contacts = yield* call(getAllContacts)
  if (!contacts || !contacts.length) {
    Logger.warn(TAG, 'Empty contacts list. Skipping import.')
    return true
  }
  AppAnalytics.track(IdentityEvents.contacts_import_complete, {
    contactImportCount: contacts.length,
  })

  yield* put(updateImportContactsProgress(ImportContactsStatus.Processing, 0, contacts.length))

  const defaultCountryCode = (yield* select(defaultCountryCodeSelector))!
  const e164NumberToRecipients = contactsToRecipients(contacts, defaultCountryCode)
  if (!e164NumberToRecipients) {
    Logger.warn(TAG, 'No recipients found')
    return true
  }

  yield* call(updateUserContact, e164NumberToRecipients)
  Logger.debug(TAG, 'Updating recipients cache')
  yield* put(setPhoneRecipientCache(e164NumberToRecipients))

  AppAnalytics.track(IdentityEvents.contacts_processing_complete)
  SentrySpanHub.finishSpan(SentrySpan.import_contacts)

  yield* spawn(saveContacts)

  return true
}

// Find the user's own contact among those imported and save useful bits
function* updateUserContact(e164NumberToRecipients: NumberToRecipient) {
  Logger.debug(TAG, 'Finding user contact details')
  const e164Number = yield* select(e164NumberSelector)

  if (!e164Number) {
    return Logger.warn(TAG, 'User phone number not set, cannot find contact info')
  }

  const userRecipient = e164NumberToRecipients[e164Number]
  if (!userRecipient) {
    return Logger.debug(TAG, 'User contact not found among recipients')
  }

  yield* put(setUserContactDetails(userRecipient.contactId, userRecipient.thumbnailPath || null))
}

export function* fetchAddressesAndValidateSaga({ e164Number }: FetchAddressesAndValidateAction) {
  AppAnalytics.track(IdentityEvents.phone_number_lookup_start)
  try {
    Logger.debug(TAG + '@fetchAddressesAndValidate', `Fetching addresses for number`)

    // Snapshot the previous mappings before we clear them so we can prune stale entries
    // after the fresh response arrives (see the pruning block below).
    const prevE164NumberToAddress = yield* select(e164NumberToAddressSelector)
    const prevAddressToE164Number = yield* select(addressToE164NumberSelector)
    const prevAddressToVerifiedBy = yield* select(addressToVerifiedBySelector)
    const prevAddresses = prevE164NumberToAddress[e164Number] ?? []

    // Clear existing entries for those numbers so our mapping consumers know new status is pending.
    yield* put(updateE164PhoneNumberAddresses({ [e164Number]: undefined }, {}))

    const { addresses, verifiedAddresses } = yield* call(fetchWalletAddresses, e164Number)

    // When `verifiedAddresses` is present, use it as source of truth:
    // it includes addresses verified by both CPV and SocialConnect.
    // The `addresses` field is used for backward compatibility.
    const walletAddresses = verifiedAddresses ? verifiedAddresses.map((v) => v.address) : addresses
    const walletAddressSet = new Set(walletAddresses)

    const e164NumberToAddressUpdates: E164NumberToAddressType = {}
    const addressToE164NumberUpdates: AddressToE164NumberType = {}
    const addressToVerifiedByUpdates: AddressToVerifiedByType = {}

    // Prune addresses previously associated with this phone number but no longer present
    // in the fresh response.
    for (const prevAddress of prevAddresses) {
      if (!walletAddressSet.has(prevAddress)) {
        // Clear the reverse mapping for this number.
        if (prevAddressToE164Number[prevAddress] === e164Number) {
          addressToE164NumberUpdates[prevAddress] = null
        }
        // Clear verifier info.
        if (prevAddress in prevAddressToVerifiedBy) {
          addressToVerifiedByUpdates[prevAddress] = null
        }
      }
    }

    if (verifiedAddresses) {
      for (const { address, verifiedBy } of verifiedAddresses) {
        addressToVerifiedByUpdates[address] = verifiedBy
      }
    }

    if (!walletAddresses.length) {
      Logger.debug(TAG + '@fetchAddressesAndValidate', `No addresses for number`)
      // Save invalid/0 addresses to avoid checking again
      // null means a contact is unverified, whereas undefined means we haven't checked yet
      e164NumberToAddressUpdates[e164Number] = null
    } else {
      e164NumberToAddressUpdates[e164Number] = walletAddresses
      walletAddresses.map((a) => (addressToE164NumberUpdates[a] = e164Number))
    }

    yield* put(
      updateE164PhoneNumberAddresses(
        e164NumberToAddressUpdates,
        addressToE164NumberUpdates,
        addressToVerifiedByUpdates
      )
    )
    AppAnalytics.track(IdentityEvents.phone_number_lookup_complete)
  } catch (err) {
    const error = ensureError(err)
    Logger.debug(TAG + '@fetchAddressesAndValidate', `Error fetching addresses`, error)
    yield* put(showErrorOrFallback(error, ErrorMessages.ADDRESS_LOOKUP_FAILURE))
    AppAnalytics.track(IdentityEvents.phone_number_lookup_error, {
      error: error.message,
    })
  } finally {
    yield* put(recipientLookupResolved())
  }
}

export function* fetchAddressVerificationSaga({ address }: FetchAddressVerificationAction) {
  const normalizedAddress = address.toLowerCase()
  try {
    AppAnalytics.track(IdentityEvents.address_lookup_start)
    const { addressVerified, verifiedBy } = yield* call(fetchAddressVerification, normalizedAddress)
    // Older backend responses omit `verifiedBy` and only signal Valora-verified addresses,
    // so fall back to 'valora' when verification is confirmed without a verifier.
    yield* put(
      updateE164PhoneNumberAddresses(
        {},
        {},
        { [normalizedAddress]: addressVerified ? (verifiedBy ?? 'valora') : null }
      )
    )
    AppAnalytics.track(IdentityEvents.address_lookup_complete)
  } catch (err) {
    const error = ensureError(err)
    Logger.debug(
      TAG + '@fetchAddressVerificationSaga',
      `Error fetching address verification`,
      error
    )
    yield* put(showErrorOrFallback(error, ErrorMessages.ADDRESS_LOOKUP_FAILURE))
    AppAnalytics.track(IdentityEvents.address_lookup_error, { error: error.message })
  } finally {
    yield* put(recipientLookupResolved())
  }
}

function* fetchWalletAddresses(e164Number: string) {
  try {
    const address = yield* select(walletAddressSelector)
    const signedMessage = yield* call(retrieveSignedMessage)

    const centralisedLookupQueryParams = new URLSearchParams({
      phoneNumber: e164Number,
      clientPlatform: Platform.OS,
      clientVersion: DeviceInfo.getVersion(),
    }).toString()

    const response: Response = yield* call(
      fetch,
      `${networkConfig.lookupPhoneNumberUrl}?${centralisedLookupQueryParams}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          authorization: `${networkConfig.authHeaderIssuer} ${address}:${signedMessage}`,
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to look up phone number: ${response.status} ${response.statusText}`)
    }

    const {
      data,
    }: {
      data: {
        addresses: string[]
        verifiedAddresses?: Array<{ address: string; verifiedBy: string }>
      }
    } = yield* call([response, 'json'])

    return {
      addresses: data.addresses.map((address) => address.toLowerCase()),
      verifiedAddresses: data.verifiedAddresses?.map((v) => ({
        ...v,
        address: v.address.toLowerCase(),
      })),
    }
  } catch (error) {
    Logger.debug(`${TAG}/fetchWalletAddresses`, 'Unable to look up phone number', error)
    throw new Error('Unable to fetch wallet address for this phone number')
  }
}

function* fetchAddressVerification(address: string) {
  try {
    const walletAddress = yield* select(walletAddressSelector)
    const signedMessage = yield* call(retrieveSignedMessage)

    const addressVerificationQueryParams = new URLSearchParams({
      address,
      clientPlatform: Platform.OS,
      clientVersion: DeviceInfo.getVersion(),
    }).toString()

    const response: Response = yield* call(
      fetchWithTimeout,
      `${networkConfig.checkAddressVerifiedUrl}?${addressVerificationQueryParams}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          authorization: `${networkConfig.authHeaderIssuer} ${walletAddress}:${signedMessage}`,
        },
      }
    )

    if (!response.ok) {
      throw new Error(
        `Failed to look up address verification: ${response.status} ${response.statusText}`
      )
    }

    const { data }: { data: { addressVerified: boolean; verifiedBy?: string | null } } =
      yield* call([response, 'json'])
    return { addressVerified: data.addressVerified, verifiedBy: data.verifiedBy }
  } catch (error) {
    Logger.warn(`${TAG}/fetchAddressVerification`, 'Unable to look up address', error)
    throw new Error('Unable to fetch verification status for this address')
  }
}

export function* saveContacts() {
  try {
    const saveContactsGate = getFeatureGate(StatsigFeatureGates.SAVE_CONTACTS)
    const phoneVerified = yield* select(phoneNumberVerifiedSelector)
    const contactsEnabled = yield* call(hasGrantedContactsPermission)

    if (!saveContactsGate || !phoneVerified || !contactsEnabled) {
      Logger.debug(`${TAG}/saveContacts`, "Skipping because pre conditions aren't met", {
        saveContactsGate,
        phoneVerified,
        contactsEnabled,
      })
      return
    }

    const recipientCache = yield* select(phoneRecipientCacheSelector)
    const ownPhoneNumber = yield* select(e164NumberSelector)
    const contacts = Object.keys(recipientCache).sort()
    const lastSavedContactsHash = yield* select(lastSavedContactsHashSelector)

    const hash = calculateSha256Hash(`${ownPhoneNumber}:${contacts.join(',')}`)

    if (hash === lastSavedContactsHash) {
      Logger.debug(
        `${TAG}/saveContacts`,
        'Skipping because contacts have not changed since last post'
      )
      return
    }

    const walletAddress = yield* select(walletAddressSelector)
    const signedMessage = yield* call(retrieveSignedMessage)

    const deviceId =
      Platform.OS === 'android'
        ? yield* call(DeviceInfo.getInstanceId)
        : yield* call(DeviceInfo.getUniqueId)

    const response: Response = yield* call(fetchWithTimeout, `${networkConfig.saveContactsUrl}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authorization: `${networkConfig.authHeaderIssuer} ${walletAddress}:${signedMessage}`,
      },
      body: JSON.stringify({
        phoneNumber: ownPhoneNumber,
        contacts,
        clientPlatform: Platform.OS,
        clientVersion: DeviceInfo.getVersion(),
        deviceId,
      }),
    })

    if (!response.ok) {
      throw new Error(
        `Failed to post contacts: ${response.status} ${yield* call([response, 'text'])}`
      )
    }

    yield* put(contactsSaved(hash))
  } catch (err) {
    Logger.warn(`${TAG}/saveContacts`, 'Post contacts failed', err)
  }
}
