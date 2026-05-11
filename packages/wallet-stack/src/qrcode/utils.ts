import * as RNFS from '@valora/react-native-fs'
import { useMemo } from 'react'
import Share from 'react-native-share'
import { showError } from 'src/alert/actions'
import AppAnalytics from 'src/analytics/AppAnalytics'
import { QrScreenEvents } from 'src/analytics/Events'
import { HooksEnablePreviewOrigin, WalletConnectPairingOrigin } from 'src/analytics/types'
import { ErrorMessages } from 'src/app/ErrorMessages'
import { DEEP_LINK_URL_SCHEME } from 'src/config'
import { handleEnableHooksPreviewDeepLink } from 'src/positions/saga'
import { allowHooksPreviewSelector } from 'src/positions/selectors'
import { UriData, uriDataFromUrl } from 'src/qrcode/schema'
import { RecipientInfo, getRecipientFromAddress } from 'src/recipients/recipient'
import { recipientInfoSelector } from 'src/recipients/reducer'
import { HandleQRCodeDetectedAction, SVG } from 'src/send/actions'
import { QrCode } from 'src/send/types'
import { handleSendPaymentData } from 'src/send/utils'
import Logger from 'src/utils/Logger'
import { initialiseWalletConnect, isWalletConnectEnabled } from 'src/walletConnect/saga'
import { handleLoadingWithTimeout } from 'src/walletConnect/walletConnect'
import { call, fork, put, select } from 'typed-redux-saga'
import { isAddress } from 'viem'

export enum QRCodeTypes {
  QR_CODE = 'QR_CODE',
}

const TAG = 'QR/utils'

const QRFileName = '/wallet_address-qr.png'

// DeepLink generates a QR code that deeplinks into the walletconnect send flow of the app
// Address generates a QR code that has the walletAddress as plaintext that is readable by wallets such as Coinbase and Metamask
export function useQRContent(data: {
  address: string
  displayName: string | undefined
  e164PhoneNumber: string | undefined
}) {
  return useMemo(() => data.address, [data.address, data.displayName, data.e164PhoneNumber, data])
}

export async function shareSVGImage(svg: SVG) {
  if (!svg) {
    return
  }
  const data = await new Promise<string>((resolve, reject) => {
    svg.toDataURL((dataURL: string | undefined) => {
      if (dataURL) {
        resolve(dataURL)
      } else {
        // Not supposed to happen, but throw in case it does :)
        reject(new Error('Got invalid SVG data'))
      }
    })
  })

  const path = RNFS.DocumentDirectoryPath + QRFileName
  await RNFS.writeFile(path, data, 'base64')
  return Share.open({
    url: 'file://' + path,
    type: 'image/png',
    failOnCancel: false, // don't throw if user cancels share
  })
}

function* extractQRAddressData(qrCode: QrCode) {
  // strip network prefix if present
  const qrAddress = qrCode.data.split(':').at(-1) || qrCode.data
  if (isAddress(qrAddress, { strict: false })) {
    qrCode.data = `${DEEP_LINK_URL_SCHEME}://wallet/pay?address=${qrAddress}`
  }
  let qrData: UriData | null
  try {
    qrData = uriDataFromUrl(qrCode.data)
  } catch (e) {
    yield* put(showError(ErrorMessages.QR_FAILED_INVALID_ADDRESS))
    Logger.error(TAG, 'qr scan failed', e)
    qrData = null
  }
  return qrData
}

// Catch all handler for QR Codes
// includes support for WalletConnect, hooks, and send flow (non-secure send)
export function* handleQRCodeDefault({
  qrCode,
  defaultTokenIdOverride,
}: HandleQRCodeDetectedAction) {
  AppAnalytics.track(QrScreenEvents.qr_scanned, qrCode)

  // TODO there's some duplication with deep links handing
  // would be nice to refactor this
  if (qrCode.data.startsWith('wc:') && (yield* call(isWalletConnectEnabled))) {
    yield* fork(handleLoadingWithTimeout, WalletConnectPairingOrigin.Scan)
    yield* call(initialiseWalletConnect, qrCode.data, WalletConnectPairingOrigin.Scan)
    return
  }
  if (
    (yield* select(allowHooksPreviewSelector)) &&
    qrCode.data.startsWith(`${DEEP_LINK_URL_SCHEME}://wallet/hooks/enablePreview`)
  ) {
    yield* call(handleEnableHooksPreviewDeepLink, qrCode.data, HooksEnablePreviewOrigin.Scan)
    return
  }

  const qrData = yield* call(extractQRAddressData, qrCode)
  if (!qrData) {
    return
  }
  const recipientInfo: RecipientInfo = yield* select(recipientInfoSelector)
  const cachedRecipient = getRecipientFromAddress(qrData.address, recipientInfo)

  yield* call(handleSendPaymentData, {
    data: qrData,
    isFromScan: true,
    cachedRecipient,
    defaultTokenIdOverride,
  })
}
