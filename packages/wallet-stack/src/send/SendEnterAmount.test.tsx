import { fireEvent, render, waitFor, within } from '@testing-library/react-native'
import BigNumber from 'bignumber.js'
import React from 'react'
import { Provider } from 'react-redux'
import AppAnalytics from 'src/analytics/AppAnalytics'
import { SendEvents } from 'src/analytics/Events'
import { SendOrigin } from 'src/analytics/types'
import { navigate } from 'src/navigator/NavigationService'
import { Screens } from 'src/navigator/Screens'
import { RecipientType } from 'src/recipients/recipient'
import SendEnterAmount from 'src/send/SendEnterAmount'
import { usePrepareSendTransactions } from 'src/send/usePrepareSendTransactions'
import { getDynamicConfigParams } from 'src/statsig'
import { getSerializablePreparedTransactionsPossible } from 'src/viem/preparedTransactionSerialization'
import { PreparedTransactionsPossible } from 'src/viem/prepareTransactions'
import MockedNavigator from 'test/MockedNavigator'
import { createMockStore, mockStoreBalancesToTokenBalances } from 'test/utils'
import {
  mockAccount,
  mockCeloAddress,
  mockCeloTokenBalance,
  mockCeloTokenId,
  mockCeurTokenId,
  mockCusdTokenId,
  mockPoofTokenId,
  mockTokenBalances,
  mockUSDCTokenId,
} from 'test/values'

jest.mock('src/statsig')
jest.mock('src/send/usePrepareSendTransactions')

jest.mocked(getDynamicConfigParams).mockReturnValue({
  miniPayTokenIds: [],
})

const mockPrepareTransactionsResultPossible: PreparedTransactionsPossible = {
  type: 'possible',
  transactions: [
    {
      from: '0xfrom',
      to: '0xto',
      data: '0xdata',
      gas: BigInt(5e15), // 0.005 CELO
      maxFeePerGas: BigInt(1),
      maxPriorityFeePerGas: undefined,
      _baseFeePerGas: BigInt(1),
    },
    {
      from: '0xfrom',
      to: '0xto',
      data: '0xdata',
      gas: BigInt(1e15), // 0.001 CELO
      maxFeePerGas: BigInt(1),
      maxPriorityFeePerGas: undefined,
      _baseFeePerGas: BigInt(1),
    },
  ],
  feeCurrency: mockCeloTokenBalance,
}

const tokenBalances = {
  [mockCeloTokenId]: { ...mockTokenBalances[mockCeloTokenId], balance: '10' },
  [mockCusdTokenId]: { ...mockTokenBalances[mockCusdTokenId], balance: '10' },
  [mockUSDCTokenId]: mockTokenBalances[mockUSDCTokenId], // filtered out for networkId
  [mockPoofTokenId]: { ...mockTokenBalances[mockPoofTokenId], balance: '0' }, // filtered out for no balance
  [mockCeurTokenId]: { ...mockTokenBalances[mockCeurTokenId], balance: '100' },
}
const feeCurrencies = [
  tokenBalances[mockCeloTokenId],
  tokenBalances[mockCeurTokenId],
  tokenBalances[mockCusdTokenId],
]
const store = createMockStore({
  tokens: {
    tokenBalances,
  },
})

const refreshPreparedTransactionsSpy = jest.fn()
jest.mocked(usePrepareSendTransactions).mockReturnValue({
  prepareTransactionsResult: undefined,
  prepareTransactionLoading: false,
  refreshPreparedTransactions: refreshPreparedTransactionsSpy,
  clearPreparedTransactions: jest.fn(),
  prepareTransactionError: undefined,
})

const params = {
  origin: SendOrigin.AppSendFlow,
  recipient: {
    recipientType: RecipientType.Address,
    address: '0x123',
  },
  isFromScan: false,
}

describe('SendEnterAmount', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render only the allowed send tokens', () => {
    const { getAllByTestId } = render(
      <Provider store={store}>
        <MockedNavigator component={SendEnterAmount} params={params} />
      </Provider>
    )

    const tokens = getAllByTestId('TokenBalanceItem')
    expect(tokens).toHaveLength(3)
    expect(tokens[0]).toHaveTextContent('CELO', { exact: false })
    expect(tokens[1]).toHaveTextContent('cEUR', { exact: false })
    expect(tokens[2]).toHaveTextContent('cUSD', { exact: false })
  })

  it('should prepare transactions with the expected inputs', async () => {
    const defaultToken = mockStoreBalancesToTokenBalances([tokenBalances[mockCeloTokenId]])[0]
    const { getByTestId } = render(
      <Provider store={store}>
        <MockedNavigator component={SendEnterAmount} params={params} />
      </Provider>
    )

    fireEvent.changeText(getByTestId('SendEnterAmount/TokenAmountInput'), '.25')

    await waitFor(() => expect(refreshPreparedTransactionsSpy).toHaveBeenCalledTimes(1))
    expect(refreshPreparedTransactionsSpy).toHaveBeenCalledWith({
      amount: new BigNumber('0.25'),
      token: defaultToken,
      walletAddress: mockAccount.toLowerCase(),
      recipientAddress: '0x123', // matches mock screen nav params
      feeCurrencies: mockStoreBalancesToTokenBalances(feeCurrencies),
    })
  })

  it('should handle navigating to the next step', async () => {
    const mockedPrepareTransactions = {
      prepareTransactionsResult: mockPrepareTransactionsResultPossible,
      prepareTransactionLoading: false,
      refreshPreparedTransactions: jest.fn(),
      clearPreparedTransactions: jest.fn(),
      prepareTransactionError: undefined,
    }
    jest.mocked(usePrepareSendTransactions).mockReturnValue(mockedPrepareTransactions)
    const { getByTestId, getByText } = render(
      <Provider store={store}>
        <MockedNavigator component={SendEnterAmount} params={params} />
      </Provider>
    )

    fireEvent.changeText(getByTestId('SendEnterAmount/TokenAmountInput'), '8')

    await waitFor(() => expect(getByText('review')).not.toBeDisabled())
    fireEvent.press(getByText('review'))

    await waitFor(() => expect(AppAnalytics.track).toHaveBeenCalledTimes(1))
    expect(AppAnalytics.track).toHaveBeenCalledWith(SendEvents.send_amount_continue, {
      amountInUsd: '106.01',
      isScan: false,
      localCurrency: 'PHP',
      localCurrencyAmount: '140.99',
      localCurrencyExchangeRate: '1.33',
      networkId: 'celo-alfajores',
      origin: 'app_send_flow',
      recipientType: 'Address',
      tokenId: mockCeloTokenId,
      underlyingAmount: '8',
      underlyingTokenAddress: mockCeloAddress,
      underlyingTokenSymbol: 'CELO',
      amountEnteredIn: 'token',
      isMiniPayRecipient: false,
    })
    expect(navigate).toHaveBeenCalledWith(Screens.SendConfirmation, {
      origin: params.origin,
      isFromScan: params.isFromScan,
      prepareTransactionsResult: getSerializablePreparedTransactionsPossible(
        mockedPrepareTransactions.prepareTransactionsResult
      ),
      transactionData: {
        tokenId: mockCeloTokenId,
        recipient: params.recipient,
        inputAmount: new BigNumber(8),
        amountIsInLocalCurrency: false,
        tokenAddress: mockCeloAddress,
        tokenAmount: new BigNumber(8),
      },
    })
  })

  it('should set the correct default token using the last used token', () => {
    const { getByTestId } = render(
      <Provider
        store={createMockStore({
          send: {
            lastUsedTokenId: mockCeurTokenId,
          },
        })}
      >
        <MockedNavigator component={SendEnterAmount} params={params} />
      </Provider>
    )

    expect(getByTestId('SendEnterAmount/TokenSelect')).toHaveTextContent('cEUR', { exact: false })
    expect(getByTestId('SendEnterAmount/TokenSelect')).not.toBeDisabled()
  })

  it('should set the correct default token given a token override and last used token', () => {
    const { getByTestId } = render(
      <Provider
        store={createMockStore({
          send: {
            lastUsedTokenId: mockCeurTokenId,
          },
        })}
      >
        <MockedNavigator
          component={SendEnterAmount}
          params={{ ...params, defaultTokenIdOverride: mockCusdTokenId }}
        />
      </Provider>
    )

    expect(getByTestId('SendEnterAmount/TokenSelect')).toHaveTextContent('cUSD', { exact: false })
    expect(getByTestId('SendEnterAmount/TokenSelect')).not.toBeDisabled()
  })

  it('should disable token selection', () => {
    const { getByTestId } = render(
      <Provider store={store}>
        <MockedNavigator
          component={SendEnterAmount}
          params={{ ...params, defaultTokenIdOverride: mockCusdTokenId, forceTokenId: true }}
        />
      </Provider>
    )

    expect(getByTestId('SendEnterAmount/TokenSelect')).toHaveTextContent('cUSD', { exact: false })
    expect(getByTestId('SendEnterAmount/TokenSelect')).toBeDisabled()
  })

  describe('MiniPay filter', () => {
    const miniPayTokenIds = [mockCusdTokenId, mockUSDCTokenId]
    // The screen now derives `isMiniPayRecipient` from the store rather than a route param,
    // so set up the verifier mapping for the recipient address used in `params`.
    const miniPayStore = createMockStore({
      tokens: { tokenBalances },
      identity: {
        addressToVerifiedBy: { [params.recipient.address.toLowerCase()]: 'minipay' },
      },
    })

    beforeEach(() => {
      jest.mocked(getDynamicConfigParams).mockReturnValue({
        miniPayTokenIds,
      })
    })

    it('should show MiniPay chip pre-selected and only MiniPay tokens when the recipient address is verified by minipay', () => {
      const { getAllByTestId, getByText } = render(
        <Provider store={miniPayStore}>
          <MockedNavigator component={SendEnterAmount} params={params} />
        </Provider>
      )

      expect(getByText('sendEnterAmountScreen.miniPayFilterChip')).toBeTruthy()

      const tokenBottomSheet = getAllByTestId('TokenBottomSheet')[0]
      const tokens = within(tokenBottomSheet).getAllByTestId('TokenBalanceItem')
      // only cUSD visible (USDC is on a different network and filtered by selector)
      expect(tokens).toHaveLength(1)
      expect(tokens[0]).toHaveTextContent('cUSD', { exact: false })
    })

    it('should select default token from MiniPay list', () => {
      const { getByTestId } = render(
        <Provider store={miniPayStore}>
          <MockedNavigator component={SendEnterAmount} params={params} />
        </Provider>
      )

      // cUSD is the only MiniPay token with balance, not CELO (which is excluded)
      expect(getByTestId('SendEnterAmount/TokenSelect')).toHaveTextContent('cUSD', { exact: false })
    })

    it('should show all tokens when MiniPay chip is toggled off', () => {
      const { getAllByTestId, getByText } = render(
        <Provider store={miniPayStore}>
          <MockedNavigator component={SendEnterAmount} params={params} />
        </Provider>
      )

      fireEvent.press(getByText('sendEnterAmountScreen.miniPayFilterChip'))

      const tokenBottomSheet = getAllByTestId('TokenBottomSheet')[0]
      const tokens = within(tokenBottomSheet).getAllByTestId('TokenBalanceItem')
      expect(tokens).toHaveLength(3)
    })

    it('should not show MiniPay chip when the recipient address is not verified by minipay', () => {
      const { queryByText } = render(
        <Provider store={store}>
          <MockedNavigator component={SendEnterAmount} params={params} />
        </Provider>
      )

      expect(queryByText('sendEnterAmountScreen.miniPayFilterChip')).toBeFalsy()
    })

    it('should not select a default token when the recipient is minipay-verified and user has no MiniPay tokens', () => {
      jest.mocked(getDynamicConfigParams).mockReturnValue({
        miniPayTokenIds: ['celo-alfajores:0xNOT_HELD_BY_USER'],
      })

      const { getByText, queryByTestId, getByTestId } = render(
        <Provider store={miniPayStore}>
          <MockedNavigator component={SendEnterAmount} params={params} />
        </Provider>
      )

      // "Select token" placeholder is rendered in place of the selected token
      expect(getByText('tokenEnterAmount.selectToken')).toBeTruthy()
      // Amount input, percentage options, and Review button are not rendered
      expect(queryByTestId('SendEnterAmount/TokenAmountInput')).toBeNull()
      expect(queryByTestId('SendEnterAmount/AmountOptions')).toBeNull()
      expect(queryByTestId('SendEnterAmount/ReviewButton')).toBeNull()
      // MiniPay filter chip is still present (inside the token picker)
      expect(getByText('sendEnterAmountScreen.miniPayFilterChip')).toBeTruthy()
      // Tapping the token row opens the picker
      fireEvent.press(getByTestId('SendEnterAmount/TokenSelect'))
      expect(getByTestId('TokenBottomSheet')).toBeTruthy()
    })

    it('should include isMiniPayRecipient=true in send_amount_continue analytics when the address is minipay-verified', async () => {
      jest.mocked(usePrepareSendTransactions).mockReturnValue({
        prepareTransactionsResult: mockPrepareTransactionsResultPossible,
        prepareTransactionLoading: false,
        refreshPreparedTransactions: jest.fn(),
        clearPreparedTransactions: jest.fn(),
        prepareTransactionError: undefined,
      })
      const { getByTestId, getByText } = render(
        <Provider store={miniPayStore}>
          <MockedNavigator component={SendEnterAmount} params={params} />
        </Provider>
      )

      fireEvent.changeText(getByTestId('SendEnterAmount/TokenAmountInput'), '8')

      await waitFor(() => expect(getByText('review')).not.toBeDisabled())
      fireEvent.press(getByText('review'))

      await waitFor(() => expect(AppAnalytics.track).toHaveBeenCalledTimes(1))
      expect(AppAnalytics.track).toHaveBeenCalledWith(
        SendEvents.send_amount_continue,
        expect.objectContaining({
          isMiniPayRecipient: true,
        })
      )
    })
  })
})
