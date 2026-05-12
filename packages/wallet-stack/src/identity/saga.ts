import {
  doImportContactsWrapper,
  fetchAddressVerificationSaga,
  fetchAddressesAndValidateSaga,
  saveContacts,
} from 'src/identity/contactMapping'
import { Actions } from 'src/identity/actions'
import Logger from 'src/utils/Logger'
import { safely } from 'src/utils/safely'
import { cancelled, spawn, takeLatest, takeLeading } from 'typed-redux-saga'

const TAG = 'identity/saga'

function* watchContactMapping() {
  yield* takeLeading(Actions.IMPORT_CONTACTS, safely(doImportContactsWrapper))
  yield* takeLatest(
    Actions.FETCH_ADDRESSES_AND_VALIDATION_STATUS,
    safely(fetchAddressesAndValidateSaga)
  )
}

function* watchFetchAddressVerification() {
  yield* takeLatest(Actions.FETCH_ADDRESS_VERIFICATION_STATUS, safely(fetchAddressVerificationSaga))
}

export function* identitySaga() {
  Logger.debug(TAG, 'Initializing identity sagas')
  try {
    yield* spawn(watchContactMapping)
    yield* spawn(watchFetchAddressVerification)
    yield* spawn(saveContacts) // save contacts on app start
  } catch (error) {
    Logger.error(TAG, 'Error initializing identity sagas', error)
  } finally {
    if (yield* cancelled()) {
      Logger.error(TAG, 'identity sagas prematurely cancelled')
    }
  }
}
