import { addressToVerifiedBySelector } from 'src/identity/selectors'
import { miniPay, valora } from 'src/images/Images'
import { useSelector } from 'src/redux/hooks'

export const VERIFIERS = {
  valora: { name: 'Valora', icon: valora },
  minipay: { name: 'MiniPay', icon: miniPay },
} as const

export type Verifier = keyof typeof VERIFIERS

export function isKnownVerifier(verifier: string | null | undefined): verifier is Verifier {
  return !!verifier && Object.hasOwn(VERIFIERS, verifier)
}

export function useVerifierName(address: string | undefined): string | null | undefined {
  const addressToVerifiedBy = useSelector(addressToVerifiedBySelector)
  if (!address) return undefined
  const verifier = addressToVerifiedBy[address.toLowerCase()]
  if (isKnownVerifier(verifier)) return VERIFIERS[verifier].name
  return verifier === null ? null : undefined
}
