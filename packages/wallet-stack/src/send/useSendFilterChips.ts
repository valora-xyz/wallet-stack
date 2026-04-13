import { useMemo } from 'react'
import { BooleanFilterChip } from 'src/components/FilterChipsCarousel'
import { getDynamicConfigParams } from 'src/statsig'
import { DynamicConfigs } from 'src/statsig/constants'
import { StatsigDynamicConfigs } from 'src/statsig/types'
import { TokenBalance } from 'src/tokens/slice'

export default function useSendFilterChips({
  isMiniPayRecipient,
  tokens,
  defaultTokenIdOverride,
  lastUsedTokenId,
}: {
  isMiniPayRecipient?: boolean
  tokens: TokenBalance[]
  defaultTokenIdOverride?: string
  lastUsedTokenId?: string | null
}): {
  filterChips: BooleanFilterChip<TokenBalance>[]
  defaultToken: TokenBalance | undefined
} {
  const { miniPayTokenIds: configTokenIds } = getDynamicConfigParams(
    DynamicConfigs[StatsigDynamicConfigs.SEND_CONFIG]
  )
  const miniPayTokenIds = isMiniPayRecipient && configTokenIds.length > 0 ? configTokenIds : null

  const filterChips: BooleanFilterChip<TokenBalance>[] = useMemo(
    () =>
      miniPayTokenIds
        ? [
            {
              id: 'minipay',
              name: 'MiniPay',
              filterFn: (token: TokenBalance) => miniPayTokenIds.includes(token.tokenId),
              isSelected: true,
            },
          ]
        : [],
    [miniPayTokenIds]
  )

  const defaultToken = useMemo(() => {
    const eligibleTokens = miniPayTokenIds
      ? tokens.filter((token) => miniPayTokenIds.includes(token.tokenId))
      : tokens
    const defaultToken = eligibleTokens.find((token) => token.tokenId === defaultTokenIdOverride)
    const lastUsedToken = eligibleTokens.find((token) => token.tokenId === lastUsedTokenId)

    return defaultToken ?? lastUsedToken ?? eligibleTokens[0]
  }, [tokens, miniPayTokenIds, defaultTokenIdOverride, lastUsedTokenId])

  return { filterChips, defaultToken }
}
