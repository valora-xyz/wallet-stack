import { addressToVerifiedBySelector } from 'src/identity/selectors'
import { miniPay as minipay, valora } from 'src/images/Images'
import { useSelector } from 'src/redux/hooks'

export type Verifier = 'valora' | 'minipay'

export const VERIFIER_NAMES: Record<Verifier, string> = Object.create(null)
VERIFIER_NAMES.valora = 'Valora'
VERIFIER_NAMES.minipay = 'MiniPay'

export const VERIFIER_ICONS: Record<Verifier, number> = {
  valora,
  minipay,
}

export function isKnownVerifier(verifier: string | null | undefined): verifier is Verifier {
  return !!verifier && verifier in VERIFIER_NAMES
}

export function useVerifierName(address: string | undefined): string | undefined {
  const addressToVerifiedBy = useSelector(addressToVerifiedBySelector)
  const verifier = address ? addressToVerifiedBy[address] : undefined
  return isKnownVerifier(verifier) ? VERIFIER_NAMES[verifier] : undefined
}
