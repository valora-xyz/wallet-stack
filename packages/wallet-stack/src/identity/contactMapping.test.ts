import { FetchMock } from 'jest-fetch-mock/types'
import { Platform } from 'react-native'
import { expectSaga } from 'redux-saga-test-plan'
import { throwError } from 'redux-saga-test-plan/providers'
import { call, select } from 'redux-saga/effects'
import { setUserContactDetails } from 'src/account/actions'
import { defaultCountryCodeSelector, e164NumberSelector } from 'src/account/selectors'
import { showError, showErrorOrFallback } from 'src/alert/actions'
import AppAnalytics from 'src/analytics/AppAnalytics'
import { IdentityEvents } from 'src/analytics/Events'
import { ErrorMessages } from 'src/app/ErrorMessages'
import { phoneNumberVerifiedSelector } from 'src/app/selectors'
import {
  Actions,
  contactsSaved,
  fetchAddressVerification,
  fetchAddressesAndValidate,
  recipientLookupResolved,
  updateE164PhoneNumberAddresses,
} from 'src/identity/actions'
import {
  doImportContactsWrapper,
  fetchAddressVerificationSaga,
  fetchAddressesAndValidateSaga,
  saveContacts,
} from 'src/identity/contactMapping'
import {
  addressToE164NumberSelector,
  addressToVerifiedBySelector,
  e164NumberToAddressSelector,
  lastSavedContactsHashSelector,
} from 'src/identity/selectors'
import { retrieveSignedMessage } from 'src/pincode/authentication'
import { contactsToRecipients } from 'src/recipients/recipient'
import { phoneRecipientCacheSelector, setPhoneRecipientCache } from 'src/recipients/reducer'
import { getFeatureGate } from 'src/statsig'
import Logger from 'src/utils/Logger'
import { getAllContacts, hasGrantedContactsPermission } from 'src/utils/contacts'
import networkConfig from 'src/web3/networkConfig'
import { getConnectedAccount } from 'src/web3/saga'
import { walletAddressSelector } from 'src/web3/selectors'
import {
  mockAccount,
  mockContactList,
  mockContactWithPhone2,
  mockE164Number,
  mockE164Number2,
  mockE164Number2Invite,
  mockE164NumberInvite,
  mockPhoneRecipientCache,
} from 'test/values'

const recipients = contactsToRecipients(mockContactList, '+1')
const mockFetch = fetch as FetchMock
jest.unmock('src/pincode/authentication')
jest.mock('src/statsig')

describe('Import Contacts Saga', () => {
  it('imports contacts and creates contact mappings correctly', async () => {
    await expectSaga(doImportContactsWrapper)
      .provide([
        [call(getConnectedAccount), null],
        [call(getAllContacts), mockContactList],
        [select(defaultCountryCodeSelector), '+1'],
        [select(e164NumberSelector), mockE164Number],
      ])
      .put(
        setUserContactDetails(
          mockContactWithPhone2.recordID,
          mockContactWithPhone2.thumbnailPath || null
        )
      )
      .put(setPhoneRecipientCache(recipients))
      .spawn(saveContacts)
      .run()
  })

  it('shows errors correctly', async () => {
    await expectSaga(doImportContactsWrapper)
      .provide([
        [call(getConnectedAccount), null],
        [call(getAllContacts), throwError(new Error('fake error'))],
        [select(defaultCountryCodeSelector), '+1'],
        [select(e164NumberSelector), mockE164Number],
      ])
      .put(showError(ErrorMessages.IMPORT_CONTACTS_FAILED))
      .not.spawn(saveContacts)
      .run()
  })
})

describe('Fetch Addresses Saga', () => {
  describe('central lookup', () => {
    beforeEach(() => {
      mockFetch.resetMocks()
    })

    const emptyMappingProviders: [any, any][] = [
      [select(e164NumberToAddressSelector), {}],
      [select(addressToE164NumberSelector), {}],
      [select(addressToVerifiedBySelector), {}],
    ]

    it('fetches and caches addresses correctly', async () => {
      const updatedAccount = '0xAbC'
      mockFetch.mockResponseOnce(JSON.stringify({ data: { addresses: [updatedAccount] } }))

      await expectSaga(fetchAddressesAndValidateSaga, fetchAddressesAndValidate(mockE164Number))
        .provide([
          ...emptyMappingProviders,
          [select(walletAddressSelector), '0xxyz'],
          [call(retrieveSignedMessage), 'some signed message'],
        ])
        .put(updateE164PhoneNumberAddresses({ [mockE164Number]: undefined }, {}))
        .put(
          updateE164PhoneNumberAddresses(
            { [mockE164Number]: ['0xabc'] },
            { '0xabc': mockE164Number },
            {}
          )
        )
        .put(recipientLookupResolved())
        .run()

      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith(
        `${networkConfig.lookupPhoneNumberUrl}?phoneNumber=%2B14155550000&clientPlatform=android&clientVersion=0.0.1`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            authorization: `${networkConfig.authHeaderIssuer} 0xxyz:some signed message`,
          },
        }
      )
    })

    it('fetches and caches multiple addresses correctly', async () => {
      const updatedAccounts = ['0xAbC', '0xdef']
      mockFetch.mockResponseOnce(JSON.stringify({ data: { addresses: updatedAccounts } }))

      await expectSaga(fetchAddressesAndValidateSaga, fetchAddressesAndValidate(mockE164Number))
        .provide([
          ...emptyMappingProviders,
          [select(walletAddressSelector), '0xxyz'],
          [call(retrieveSignedMessage), 'some signed message'],
        ])
        .put(updateE164PhoneNumberAddresses({ [mockE164Number]: undefined }, {}))
        .put(
          updateE164PhoneNumberAddresses(
            { [mockE164Number]: ['0xabc', '0xdef'] },
            { '0xabc': mockE164Number, '0xdef': mockE164Number },
            {}
          )
        )
        .run()
    })

    it('uses verifiedAddresses as source of truth when present', async () => {
      // addresses only contains DB-verified addresses (backward compat),
      // verifiedAddresses contains all (DB + SC) and is the source of truth
      mockFetch.mockResponseOnce(
        JSON.stringify({
          data: {
            addresses: ['0xAbC'],
            verifiedAddresses: [
              { address: '0xAbC', verifiedBy: 'valora' },
              { address: '0xDef', verifiedBy: 'minipay' },
            ],
          },
        })
      )

      await expectSaga(fetchAddressesAndValidateSaga, fetchAddressesAndValidate(mockE164Number))
        .provide([
          ...emptyMappingProviders,
          [select(walletAddressSelector), '0xxyz'],
          [call(retrieveSignedMessage), 'some signed message'],
        ])
        .put(updateE164PhoneNumberAddresses({ [mockE164Number]: undefined }, {}))
        .put(
          updateE164PhoneNumberAddresses(
            { [mockE164Number]: ['0xabc', '0xdef'] },
            { '0xabc': mockE164Number, '0xdef': mockE164Number },
            { '0xabc': 'valora', '0xdef': 'minipay' }
          )
        )
        .run()
    })

    it('prunes stale address mappings no longer returned by the fresh lookup', async () => {
      mockFetch.mockResponseOnce(
        JSON.stringify({
          data: {
            addresses: ['0xkept'],
            verifiedAddresses: [{ address: '0xkept', verifiedBy: 'valora' }],
          },
        })
      )

      await expectSaga(fetchAddressesAndValidateSaga, fetchAddressesAndValidate(mockE164Number))
        .provide([
          [select(e164NumberToAddressSelector), { [mockE164Number]: ['0xstale', '0xkept'] }],
          [
            select(addressToE164NumberSelector),
            { '0xstale': mockE164Number, '0xkept': mockE164Number },
          ],
          [select(addressToVerifiedBySelector), { '0xstale': 'valora', '0xkept': 'valora' }],
          [select(walletAddressSelector), '0xxyz'],
          [call(retrieveSignedMessage), 'some signed message'],
        ])
        .put(updateE164PhoneNumberAddresses({ [mockE164Number]: undefined }, {}))
        .put(
          updateE164PhoneNumberAddresses(
            { [mockE164Number]: ['0xkept'] },
            { '0xstale': null, '0xkept': mockE164Number },
            { '0xstale': null, '0xkept': 'valora' }
          )
        )
        .run()
    })

    it('handles lookup errors correctly', async () => {
      mockFetch.mockReject()

      await expectSaga(fetchAddressesAndValidateSaga, fetchAddressesAndValidate(mockE164Number))
        .provide([
          ...emptyMappingProviders,
          [select(walletAddressSelector), '0xxyz'],
          [call(retrieveSignedMessage), 'some signed message'],
        ])
        .put(showErrorOrFallback(expect.anything(), ErrorMessages.ADDRESS_LOOKUP_FAILURE))
        .put(recipientLookupResolved())
        .run()
    })
  })
})

describe('Fetch Address Verification Saga', () => {
  beforeEach(() => {
    mockFetch.resetMocks()
  })

  it('records the `verifiedBy` value returned by the backend', async () => {
    mockFetch.mockResponseOnce(
      JSON.stringify({ data: { addressVerified: true, verifiedBy: 'minipay' } })
    )

    await expectSaga(fetchAddressVerificationSaga, fetchAddressVerification(mockAccount))
      .provide([
        [select(walletAddressSelector), '0xxyz'],
        [call(retrieveSignedMessage), 'some signed message'],
      ])
      .put(updateE164PhoneNumberAddresses({}, {}, { [mockAccount.toLowerCase()]: 'minipay' }))
      .put(recipientLookupResolved())
      .run()

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith(
      `${networkConfig.checkAddressVerifiedUrl}?address=${mockAccount.toLowerCase()}&clientPlatform=android&clientVersion=0.0.1`,
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          authorization: `${networkConfig.authHeaderIssuer} 0xxyz:some signed message`,
        }),
      })
    )
  })

  it('falls back to `valora` when the backend confirms the address without a `verifiedBy` field', async () => {
    mockFetch.mockResponseOnce(JSON.stringify({ data: { addressVerified: true } }))

    await expectSaga(fetchAddressVerificationSaga, fetchAddressVerification(mockAccount))
      .provide([
        [select(walletAddressSelector), '0xxyz'],
        [call(retrieveSignedMessage), 'some signed message'],
      ])
      .put(updateE164PhoneNumberAddresses({}, {}, { [mockAccount.toLowerCase()]: 'valora' }))
      .run()
  })

  it('records `null` (checked, not verified) when the backend returns false', async () => {
    mockFetch.mockResponseOnce(JSON.stringify({ data: { addressVerified: false } }))

    await expectSaga(fetchAddressVerificationSaga, fetchAddressVerification(mockAccount))
      .provide([
        [select(walletAddressSelector), '0xxyz'],
        [call(retrieveSignedMessage), 'some signed message'],
      ])
      .put(updateE164PhoneNumberAddresses({}, {}, { [mockAccount.toLowerCase()]: null }))
      .run()
  })

  it('does not touch `addressToVerifiedBy` on network errors — the check is inconclusive, not negative', async () => {
    mockFetch.mockReject()
    await expectSaga(fetchAddressVerificationSaga, fetchAddressVerification(mockAccount))
      .provide([
        [select(walletAddressSelector), '0xxyz'],
        [call(retrieveSignedMessage), 'some signed message'],
      ])
      .not.put.actionType(Actions.UPDATE_E164_PHONE_NUMBER_ADDRESSES)
      .put(showErrorOrFallback(expect.anything(), ErrorMessages.ADDRESS_LOOKUP_FAILURE))
      .put(recipientLookupResolved())
      .run()
    expect(AppAnalytics.track).toHaveBeenCalledWith(IdentityEvents.address_lookup_error, {
      error: 'Unable to fetch verification status for this address',
    })
  })
})

describe('saveContacts', () => {
  const warnSpy = jest.spyOn(Logger, 'warn')
  beforeEach(() => {
    mockFetch.resetMocks()
    jest.mocked(getFeatureGate).mockReturnValue(true)
    jest.clearAllMocks()
  })

  it.each([
    { platform: 'ios', deviceId: 'abc-def-123' },
    { platform: 'android', deviceId: '123-456' },
  ])(
    'invokes saveContacts API and saves last posted hash if not already saved',
    async ({ platform, deviceId }) => {
      Platform.OS = platform as 'ios' | 'android'
      await expectSaga(saveContacts)
        .provide([
          [select(phoneNumberVerifiedSelector), true],
          [call(hasGrantedContactsPermission), true],
          [select(phoneRecipientCacheSelector), mockPhoneRecipientCache],
          [select(e164NumberSelector), mockE164Number],
          [select(lastSavedContactsHashSelector), null],
          [select(walletAddressSelector), '0xxyz'],
          [call(retrieveSignedMessage), 'some signed message'],
        ])
        .put(contactsSaved('72a546e3fc087906f225c620888cae129156a2413bbb1eb0f82f647cedde1350'))
        .run()

      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith(networkConfig.saveContactsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `${networkConfig.authHeaderIssuer} 0xxyz:some signed message`,
        },
        body: JSON.stringify({
          phoneNumber: mockE164Number,
          contacts: [mockE164NumberInvite, mockE164Number, mockE164Number2Invite],
          clientPlatform: platform,
          clientVersion: '0.0.1',
          deviceId,
        }),
        signal: expect.any(AbortSignal),
      })
    }
  )

  it('invokes saveContacts API and saves last posted hash if contacts are different', async () => {
    await expectSaga(saveContacts)
      .provide([
        [select(phoneNumberVerifiedSelector), true],
        [call(hasGrantedContactsPermission), true],
        [
          select(phoneRecipientCacheSelector),
          { ...mockPhoneRecipientCache, [mockE164Number2]: {} },
        ],
        [select(e164NumberSelector), mockE164Number],
        [
          select(lastSavedContactsHashSelector),
          '72a546e3fc087906f225c620888cae129156a2413bbb1eb0f82f647cedde1350',
        ],
        [select(walletAddressSelector), '0xxyz'],
        [call(retrieveSignedMessage), 'some signed message'],
      ])
      .put(contactsSaved('68498dee3633b92eb7b7107201e18a228b4a381b5cf222d59f6eaf75c19cca7d'))
      .run()

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith(networkConfig.saveContactsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authorization: `${networkConfig.authHeaderIssuer} 0xxyz:some signed message`,
      },
      body: JSON.stringify({
        phoneNumber: mockE164Number,
        contacts: [mockE164Number2, mockE164NumberInvite, mockE164Number, mockE164Number2Invite],
        clientPlatform: 'android',
        clientVersion: '0.0.1',
        deviceId: '123-456',
      }),
      signal: expect.any(AbortSignal),
    })
  })

  it('skips if last saved contacts is the same as current', async () => {
    await expectSaga(saveContacts)
      .provide([
        [select(phoneNumberVerifiedSelector), true],
        [call(hasGrantedContactsPermission), true],
        [select(phoneRecipientCacheSelector), mockPhoneRecipientCache],
        [select(e164NumberSelector), mockE164Number],
        [
          select(lastSavedContactsHashSelector),
          '72a546e3fc087906f225c620888cae129156a2413bbb1eb0f82f647cedde1350',
        ],
        [select(walletAddressSelector), '0xxyz'],
        [call(retrieveSignedMessage), 'some signed message'],
      ])
      .not.put.actionType(Actions.CONTACTS_SAVED)
      .run()

    expect(mockFetch).toHaveBeenCalledTimes(0)
  })

  it.each([
    { featureGate: false, phoneVerified: true, contactsEnabled: true, name: 'feature gate' },
    { featureGate: true, phoneVerified: false, contactsEnabled: true, name: 'phone unverified' },
    { featureGate: true, phoneVerified: true, contactsEnabled: false, name: 'contacts disabled' },
  ])(
    'skips if pre-conditions are not met - $name',
    async ({ featureGate, phoneVerified, contactsEnabled }) => {
      jest.mocked(getFeatureGate).mockReturnValue(featureGate)
      await expectSaga(saveContacts)
        .provide([
          [select(phoneNumberVerifiedSelector), phoneVerified],
          [call(hasGrantedContactsPermission), contactsEnabled],
        ])
        .not.select(phoneRecipientCacheSelector)
        .not.select(e164NumberSelector)
        .run()

      expect(mockFetch).toHaveBeenCalledTimes(0)
    }
  )

  it('handles errors gracefully and logs a warning', async () => {
    mockFetch.mockReject()
    await expectSaga(saveContacts)
      .provide([
        [select(phoneNumberVerifiedSelector), true],
        [call(hasGrantedContactsPermission), true],
        [select(phoneRecipientCacheSelector), mockPhoneRecipientCache],
        [select(e164NumberSelector), mockE164Number],
        [select(lastSavedContactsHashSelector), undefined],
        [select(walletAddressSelector), '0xxyz'],
        [call(retrieveSignedMessage), 'some signed message'],
      ])
      .not.put.actionType(Actions.CONTACTS_SAVED)
      .run()
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith(networkConfig.saveContactsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authorization: `${networkConfig.authHeaderIssuer} 0xxyz:some signed message`,
      },
      body: JSON.stringify({
        phoneNumber: mockE164Number,
        contacts: [mockE164NumberInvite, mockE164Number, mockE164Number2Invite],
        clientPlatform: 'android',
        clientVersion: '0.0.1',
        deviceId: '123-456',
      }),
      signal: expect.any(AbortSignal),
    })
    expect(warnSpy).toHaveBeenCalledTimes(1)
  })
})
