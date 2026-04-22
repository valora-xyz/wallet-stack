import { useState } from 'react'
import { fetchAddressVerification, fetchAddressesAndValidate } from 'src/identity/actions'
import { addressToVerifiedBySelector, e164NumberToAddressSelector } from 'src/identity/selectors'
import { RecipientVerificationStatus } from 'src/identity/types'
import { Recipient, RecipientType } from 'src/recipients/recipient'
import { useDispatch, useSelector } from 'src/redux/hooks'

type E164NumberToAddress = ReturnType<typeof e164NumberToAddressSelector>
type AddressToVerifiedBy = ReturnType<typeof addressToVerifiedBySelector>

const getRecipientVerificationStatus = (
  recipient: Recipient | null,
  e164NumberToAddress: E164NumberToAddress,
  addressToVerifiedBy: AddressToVerifiedBy
): RecipientVerificationStatus => {
  if (!recipient) {
    return RecipientVerificationStatus.UNKNOWN
  }

  if (recipient.recipientType === RecipientType.PhoneNumber && recipient.e164PhoneNumber) {
    const addresses = e164NumberToAddress[recipient.e164PhoneNumber]
    if (addresses === undefined) return RecipientVerificationStatus.UNKNOWN
    return addresses === null
      ? RecipientVerificationStatus.UNVERIFIED
      : RecipientVerificationStatus.VERIFIED
  }

  if (recipient.address) {
    const entry = addressToVerifiedBy[recipient.address.toLowerCase()]
    if (entry === undefined) return RecipientVerificationStatus.UNKNOWN
    return entry === null
      ? RecipientVerificationStatus.UNVERIFIED
      : RecipientVerificationStatus.VERIFIED
  }

  return RecipientVerificationStatus.UNKNOWN
}

const useFetchRecipientVerificationStatus = () => {
  const [recipient, setRecipient] = useState<Recipient | null>(null)

  const e164NumberToAddress = useSelector(e164NumberToAddressSelector)
  const addressToVerifiedBy = useSelector(addressToVerifiedBySelector)
  const dispatch = useDispatch()

  const unsetSelectedRecipient = () => {
    setRecipient(null)
  }

  const setSelectedRecipient = (selectedRecipient: Recipient) => {
    setRecipient(selectedRecipient)

    if (
      selectedRecipient.recipientType === RecipientType.PhoneNumber &&
      selectedRecipient.e164PhoneNumber
    ) {
      dispatch(fetchAddressesAndValidate(selectedRecipient.e164PhoneNumber))
    } else if (selectedRecipient.address) {
      dispatch(fetchAddressVerification(selectedRecipient.address))
    }
  }

  const recipientVerificationStatus = getRecipientVerificationStatus(
    recipient,
    e164NumberToAddress,
    addressToVerifiedBy
  )

  return {
    recipient,
    setSelectedRecipient,
    unsetSelectedRecipient,
    recipientVerificationStatus,
  }
}

export default useFetchRecipientVerificationStatus
