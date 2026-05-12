import { fireEvent, render } from '@testing-library/react-native'
import * as React from 'react'
import SelectRecipientAddressList from 'src/send/SelectRecipientAddressList'

const mockAddress = '0x0000000000000000000000000000000000000001'
const mockAddress2 = '0x0000000000000000000000000000000000000002'

describe('SelectRecipientAddressList', () => {
  it('renders one row per entry with the verifier name and a shortened address', () => {
    const { getByTestId } = render(
      <SelectRecipientAddressList
        entries={[
          { address: mockAddress, verifier: 'valora' },
          { address: mockAddress2, verifier: 'minipay' },
        ]}
        onSelectAddress={jest.fn()}
      />
    )

    const valoraRow = getByTestId(`SelectRecipientAddress/Row/${mockAddress}`)
    expect(valoraRow).toHaveTextContent('Valora', { exact: false })
    expect(valoraRow).toHaveTextContent('0x0000...0001', { exact: false })

    const minipayRow = getByTestId(`SelectRecipientAddress/Row/${mockAddress2}`)
    expect(minipayRow).toHaveTextContent('MiniPay', { exact: false })
    expect(minipayRow).toHaveTextContent('0x0000...0002', { exact: false })
  })

  it('renders an unverified row with a warning label when verifier is null', () => {
    const { getByTestId } = render(
      <SelectRecipientAddressList
        entries={[{ address: mockAddress, verifier: null }]}
        onSelectAddress={jest.fn()}
      />
    )

    const row = getByTestId(`SelectRecipientAddress/Row/${mockAddress}`)
    expect(row).toHaveTextContent('unverifiedAddress', { exact: false })
    expect(row).toHaveTextContent('0x0000...0001', { exact: false })
  })

  it('invokes onSelectAddress with null verifier when an unverified row is tapped', () => {
    const onSelectAddress = jest.fn()
    const { getByTestId } = render(
      <SelectRecipientAddressList
        entries={[{ address: mockAddress, verifier: null }]}
        onSelectAddress={onSelectAddress}
      />
    )

    fireEvent.press(getByTestId(`SelectRecipientAddress/Row/${mockAddress}`))
    expect(onSelectAddress).toHaveBeenCalledWith(mockAddress, null)
  })

  it('invokes onSelectAddress with the row address and verifier when tapped', () => {
    const onSelectAddress = jest.fn()
    const { getByTestId } = render(
      <SelectRecipientAddressList
        entries={[{ address: mockAddress, verifier: 'minipay' }]}
        onSelectAddress={onSelectAddress}
      />
    )

    fireEvent.press(getByTestId(`SelectRecipientAddress/Row/${mockAddress}`))

    expect(onSelectAddress).toHaveBeenCalledWith(mockAddress, 'minipay')
  })
})
