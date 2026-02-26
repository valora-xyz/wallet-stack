import AppAnalytics from 'src/analytics/AppAnalytics'
import { getCurrentUserTraits } from 'src/analytics/selectors'
import { Actions, SetAnalyticsEnabled } from 'src/app/actions'
import { safely } from 'src/utils/safely'
import { call, select, spawn, take, takeEvery } from 'typed-redux-saga'

export function* updateUserTraits() {
  let prevTraits
  while (true) {
    const traits = yield* select(getCurrentUserTraits)
    if (traits !== prevTraits) {
      const { walletAddress } = traits
      yield* call([AppAnalytics, 'identify'], walletAddress as string | null, traits)
      prevTraits = traits
    }

    yield* take()
  }
}

export function* handleSetAnalyticsEnabled(action: SetAnalyticsEnabled) {
  yield* call([AppAnalytics, 'setAnalyticsEnabled'], action.enabled)
}

function* watchAnalyticsEnabled() {
  yield* takeEvery(Actions.SET_ANALYTICS_ENABLED, safely(handleSetAnalyticsEnabled))
}

export function* analyticsSaga() {
  yield* spawn(updateUserTraits)
  yield* spawn(watchAnalyticsEnabled)
}
