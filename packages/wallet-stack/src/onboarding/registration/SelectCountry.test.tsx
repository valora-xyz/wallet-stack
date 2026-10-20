import { fireEvent, render } from '@testing-library/react-native'
import * as React from 'react'
import 'react-native'
import { Provider } from 'react-redux'
import i18n from 'src/i18n'
import { Screens } from 'src/navigator/Screens'
import SelectCountry from 'src/onboarding/registration/SelectCountry'
import { Countries } from 'src/utils/Countries'
import { createMockStore, getMockStackScreenProps } from 'test/utils'

const onSelectCountry = jest.fn()

const mockScreenProps = getMockStackScreenProps(Screens.SelectCountry, {
  countries: new Countries(i18n.language),
  selectedCountryCodeAlpha2: 'DE',
  onSelectCountry,
})

describe('SelectCountry', () => {
  it('does not render sanctioned countries', () => {
    const tree = render(
      <Provider store={createMockStore({})}>
        <SelectCountry {...mockScreenProps} />
      </Provider>
    )
    // Germany shows up
    fireEvent.changeText(tree.getByTestId('SearchInput'), 'Germany')
    expect(tree.queryByText('Germany')).not.toBeNull()
    // Syria shows up
    fireEvent.changeText(tree.getByTestId('SearchInput'), 'Syria')
    expect(tree.queryByText('Syrian Arab Republic')).not.toBeNull()
    // Cuba does not
    fireEvent.changeText(tree.getByTestId('SearchInput'), 'Cuba')
    expect(tree.queryByText('Cuba')).toBeNull()
    // Iran does not
    fireEvent.changeText(tree.getByTestId('SearchInput'), 'Iran')
    expect(tree.queryByText('Iran, Islamic Republic Of')).toBeNull()
    // North Korea does not
    fireEvent.changeText(tree.getByTestId('SearchInput'), 'Korea')
    expect(tree.queryByText("Korea, Democratic People's Republic Of")).toBeNull()
  })
  it('tapping a country calls onSelectCountry', () => {
    const tree = render(
      <Provider store={createMockStore({})}>
        <SelectCountry {...mockScreenProps} />
      </Provider>
    )
    // Germany shows up
    fireEvent.changeText(tree.getByTestId('SearchInput'), 'Germany')
    expect(tree.queryByText('Germany')).not.toBeNull()
    fireEvent.press(tree.getByText('Germany'))
    expect(onSelectCountry).toHaveBeenCalledWith('DE')
  })
})
