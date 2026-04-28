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

export function useVerifierName(address: string | undefined): string | undefined {
  const addressToVerifiedBy = useSelector(addressToVerifiedBySelector)
  const verifier = address ? addressToVerifiedBy[address.toLowerCase()] : undefined
  return isKnownVerifier(verifier) ? VERIFIERS[verifier].name : undefined
}
