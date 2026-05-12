import { useEffect } from 'react'
import { fetchAddressVerification, fetchAddressesAndValidate } from 'src/identity/actions'
import type { AddressToVerifiedByType } from 'src/identity/reducer'
import {
  addressToVerifiedBySelector,
  e164NumberToAddressSelector,
  recipientLookupLoadingSelector,
} from 'src/identity/selectors'
import { Recipient } from 'src/recipients/recipient'
import { type Verifier, isKnownVerifier } from 'src/recipients/verifier'
import { useDispatch, useSelector } from 'src/redux/hooks'

export type RecipientLookupStatus = 'unknown' | 'loading' | 'verified' | 'unverified'

export interface VerifiedAddressEntry {
  address: string
  verifier: Verifier
}

function getVerifiedAddresses(
  addresses: readonly string[],
  addressToVerifiedBy: AddressToVerifiedByType
): VerifiedAddressEntry[] {
  return addresses
    .map((address) => ({ address, verifier: addressToVerifiedBy[address] }))
    .filter((entry): entry is VerifiedAddressEntry => isKnownVerifier(entry.verifier))
}

/**
 * Dispatches a verification lookup for `recipient` and returns the status plus any verified
 * addresses linked to the phone number. Pass `skipFetch` when the caller has already triggered
 * a fresh lookup and re-fetching would be wasteful.
 */
export function useRecipientLookup(
  recipient: Recipient & { address: string },
  options: { skipFetch?: boolean } = {}
): { status: RecipientLookupStatus; verifiedAddresses: VerifiedAddressEntry[] } {
  const dispatch = useDispatch()
  const e164PhoneNumber = recipient.e164PhoneNumber
  const recipientAddress = recipient.address.toLowerCase()
  const skipFetch = !!options.skipFetch

  const e164NumberToAddress = useSelector(e164NumberToAddressSelector)
  const addressToVerifiedBy = useSelector(addressToVerifiedBySelector)
  const recipientLookupLoading = useSelector(recipientLookupLoadingSelector)

  useEffect(() => {
    if (skipFetch || !e164PhoneNumber) return
    dispatch(fetchAddressesAndValidate(e164PhoneNumber))
  }, [dispatch, e164PhoneNumber, skipFetch])

  useEffect(() => {
    if (skipFetch || e164PhoneNumber) return
    dispatch(fetchAddressVerification(recipientAddress))
  }, [dispatch, e164PhoneNumber, recipientAddress, skipFetch])

  const cachedAddresses = e164PhoneNumber ? e164NumberToAddress[e164PhoneNumber] : undefined
  const verifiedAddresses = getVerifiedAddresses(cachedAddresses ?? [], addressToVerifiedBy)

  const verifier = addressToVerifiedBy[recipientAddress]

  let status: RecipientLookupStatus
  if (recipientLookupLoading) {
    status = 'loading'
  } else if (isKnownVerifier(verifier)) {
    status = 'verified'
  } else if (verifier === null || cachedAddresses === null) {
    status = 'unverified'
  } else {
    status = 'unknown'
  }

  return { status, verifiedAddresses }
}
