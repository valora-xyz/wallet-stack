import * as React from 'react'
import { StyleProp, StyleSheet, ViewStyle } from 'react-native'
import ReactNativeModal from 'react-native-modal'
import { SafeAreaView } from 'react-native-safe-area-context'
import Card from 'src/components/Card'
import colors from 'src/styles/colors'

interface Props {
  children: React.ReactNode
  isVisible: boolean
  style?: StyleProp<ViewStyle>
  modalStyle?: StyleProp<ViewStyle>
  testID?: string
  onBackgroundPress?: () => void
  onModalHide?: () => void
}

export default function Modal({
  children,
  isVisible,
  style,
  modalStyle,
  testID,
  onBackgroundPress,
  onModalHide,
}: Props) {
  return (
    <ReactNativeModal
      testID={testID}
      style={modalStyle}
      isVisible={isVisible}
      backdropOpacity={0.1}
      onBackdropPress={onBackgroundPress}
      statusBarTranslucent={true}
      onModalHide={onModalHide}
    >
      <SafeAreaView>
        <Card style={[styles.root, style]} rounded={true}>
          {children}
        </Card>
      </SafeAreaView>
    </ReactNativeModal>
  )
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.backgroundPrimary,
    padding: 24,
    maxHeight: '100%',
  },
})
