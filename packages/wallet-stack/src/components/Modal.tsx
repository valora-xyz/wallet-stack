import * as React from 'react'
import { Modal as RNModal, Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native'
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
  // RN's <Modal> only fires `onDismiss` on iOS; emit `onModalHide` cross-platform
  // whenever `isVisible` transitions from true to false.
  const wasVisible = React.useRef(isVisible)
  React.useEffect(() => {
    if (wasVisible.current && !isVisible) {
      onModalHide?.()
    }
    wasVisible.current = isVisible
  }, [isVisible, onModalHide])

  return (
    <RNModal
      visible={isVisible}
      transparent={true}
      animationType="fade"
      statusBarTranslucent={true}
      onRequestClose={onBackgroundPress}
      testID={testID}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onBackgroundPress} />
        <View style={[styles.contentWrapper, modalStyle]} pointerEvents="box-none">
          <SafeAreaView>
            <Card style={[styles.root, style]} rounded={true}>
              {children}
            </Card>
          </SafeAreaView>
        </View>
      </View>
    </RNModal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  // Mirrors react-native-modal's default outer style so the card stays inset
  // from screen edges and centered vertically.
  contentWrapper: {
    flex: 1,
    margin: 20,
    justifyContent: 'center',
  },
  root: {
    backgroundColor: colors.backgroundPrimary,
    padding: 24,
    maxHeight: '100%',
  },
})
