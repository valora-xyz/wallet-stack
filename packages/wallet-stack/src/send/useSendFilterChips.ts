import { BooleanFilterChip } from 'src/components/FilterChipsCarousel'
import { getDynamicConfigParams } from 'src/statsig'
import { DynamicConfigs } from 'src/statsig/constants'
import { StatsigDynamicConfigs } from 'src/statsig/types'
import { TokenBalance } from 'src/tokens/slice'

export default function useSendFilterChips(isMiniPayRecipient?: boolean): {
  filterChips: BooleanFilterChip<TokenBalance>[]
  miniPayTokenIds: string[] | null
} {
  const { miniPayTokenIds: configTokenIds } = getDynamicConfigParams(
    DynamicConfigs[StatsigDynamicConfigs.SEND_CONFIG]
  )
  const miniPayTokenIds = isMiniPayRecipient && configTokenIds.length > 0 ? configTokenIds : null

  const filterChips: BooleanFilterChip<TokenBalance>[] = miniPayTokenIds
    ? [
        {
          id: 'minipay',
          name: 'MiniPay',
          filterFn: (token: TokenBalance) => miniPayTokenIds.includes(token.tokenId),
          isSelected: true,
        },
      ]
    : []

  return { filterChips, miniPayTokenIds }
}
