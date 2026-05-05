import { NativeStackScreenProps } from '@react-navigation/native-stack'
import BigNumber from 'bignumber.js'
import React, { useCallback, useMemo, useState } from 'react'
import AppAnalytics from 'src/analytics/AppAnalytics'
import { SendEvents } from 'src/analytics/Events'
import { addressToVerifiedBySelector } from 'src/identity/selectors'
import { getLocalCurrencyCode, usdToLocalCurrencyRateSelector } from 'src/localCurrency/selectors'
import { navigate } from 'src/navigator/NavigationService'
import { Screens } from 'src/navigator/Screens'
import { StackParamList } from 'src/navigator/types'
import { useSelector } from 'src/redux/hooks'
import EnterAmount, { ProceedArgs, SendProceed } from 'src/send/EnterAmount'
import SelectedRecipientCard from 'src/send/SelectedRecipientCard'
import { lastUsedTokenIdSelector } from 'src/send/selectors'
import { usePrepareSendTransactions } from 'src/send/usePrepareSendTransactions'
import { useRecipientLookup } from 'src/send/useRecipientLookup'
import useSendFilterChips from 'src/send/useSendFilterChips'
import { sortedTokensWithBalanceOrShowZeroBalanceSelector } from 'src/tokens/selectors'
import { TokenBalance } from 'src/tokens/slice'
import Logger from 'src/utils/Logger'
import { getSerializablePreparedTransactionsPossible } from 'src/viem/preparedTransactionSerialization'
import { walletAddressSelector } from 'src/web3/selectors'

type Props = NativeStackScreenProps<StackParamList, Screens.SendEnterAmount>

const TAG = 'SendEnterAmount'

function SendEnterAmount({ route }: Props) {
  const {
    defaultTokenIdOverride,
    origin,
    recipient: initialRecipient,
    isFromScan,
    forceTokenId,
    skipRecipientLookup,
  } = route.params

  // Local state lets the user swap addresses (via SelectedRecipientCard) without re-navigating,
  // so the typed amount is preserved.
  const [selectedAddress, setSelectedAddress] = useState(initialRecipient.address)
  const recipient = useMemo(
    () => ({ ...initialRecipient, address: selectedAddress }),
    [initialRecipient, selectedAddress]
  )

  const { status: lookupStatus, verifiedAddresses } = useRecipientLookup(recipient, {
    skipFetch: skipRecipientLookup,
  })

  // Derive from the store so a fresh lookup that updates the verifier is reflected
  // immediately (token filtering and analytics stay in sync with the selected address).
  const addressToVerifiedBy = useSelector(addressToVerifiedBySelector)
  const isMiniPayRecipient = addressToVerifiedBy[selectedAddress.toLowerCase()] === 'minipay'

  // explicitly allow zero state tokens to be shown for exploration purposes for
  // new users with no balance
  const tokens = useSelector(sortedTokensWithBalanceOrShowZeroBalanceSelector)
  const lastUsedTokenId = useSelector(lastUsedTokenIdSelector)
  const { filterChips, defaultToken } = useSendFilterChips({
    isMiniPayRecipient,
    tokens,
    defaultTokenIdOverride,
    lastUsedTokenId,
  })

  const localCurrencyCode = useSelector(getLocalCurrencyCode)
  const localCurrencyExchangeRate = useSelector(usdToLocalCurrencyRateSelector)

  const handleReviewSend = ({ tokenAmount, localAmount, token, amountEnteredIn }: ProceedArgs) => {
    if (!prepareTransactionsResult || prepareTransactionsResult.type !== 'possible') {
      // should never happen because button is disabled if send is not possible
      throw new Error('No prepared transactions found')
    }

    navigate(Screens.SendConfirmation, {
      origin,
      isFromScan,
      prepareTransactionsResult:
        getSerializablePreparedTransactionsPossible(prepareTransactionsResult),
      transactionData: {
        tokenId: token.tokenId,
        recipient,
        inputAmount: tokenAmount,
        amountIsInLocalCurrency: false,
        tokenAddress: token.address!,
        tokenAmount,
      },
    })
    AppAnalytics.track(SendEvents.send_amount_continue, {
      origin,
      isScan: isFromScan,
      recipientType: recipient.recipientType,
      localCurrencyExchangeRate,
      localCurrency: localCurrencyCode,
      localCurrencyAmount: localAmount?.toFixed(2) ?? null,
      underlyingTokenAddress: token.address,
      underlyingTokenSymbol: token.symbol,
      underlyingAmount: tokenAmount.toString(),
      amountInUsd: tokenAmount.multipliedBy(token.priceUsd ?? 0).toFixed(2),
      amountEnteredIn,
      tokenId: token.tokenId,
      networkId: token.networkId,
      isMiniPayRecipient,
    })
  }

  const {
    prepareTransactionsResult,
    refreshPreparedTransactions,
    clearPreparedTransactions,
    prepareTransactionError,
    prepareTransactionLoading,
  } = usePrepareSendTransactions()

  const walletAddress = useSelector(walletAddressSelector)

  const handleRefreshPreparedTransactions = (
    amount: BigNumber,
    token: TokenBalance,
    feeCurrencies: TokenBalance[]
  ) => {
    if (!walletAddress) {
      Logger.error(TAG, 'Wallet address not set. Cannot refresh prepared transactions.')
      return
    }

    return refreshPreparedTransactions({
      amount,
      token,
      recipientAddress: recipient.address,
      walletAddress,
      feeCurrencies,
    })
  }

  const handleSelectAddress = useCallback((address: string) => {
    setSelectedAddress(address)
  }, [])

  return (
    <EnterAmount
      tokens={tokens}
      defaultToken={defaultToken}
      prepareTransactionsResult={prepareTransactionsResult}
      prepareTransactionsLoading={prepareTransactionLoading}
      onClearPreparedTransactions={clearPreparedTransactions}
      onRefreshPreparedTransactions={handleRefreshPreparedTransactions}
      prepareTransactionError={prepareTransactionError}
      tokenSelectionDisabled={!!forceTokenId}
      onPressProceed={handleReviewSend}
      disableProceed={lookupStatus === 'loading'}
      ProceedComponent={SendProceed}
      filterChips={filterChips}
      recipientSlot={
        <SelectedRecipientCard
          recipient={recipient}
          status={lookupStatus}
          verifiedAddresses={verifiedAddresses}
          originalAddress={initialRecipient.address}
          onSelectAddress={handleSelectAddress}
        />
      }
    />
  )
}

export default SendEnterAmount
