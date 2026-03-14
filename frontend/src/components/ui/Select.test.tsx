import { render, screen } from '@testing-library/react'
import { Select } from './Select'

const options = [
  { value: 'a', label: 'Option A' },
  { value: 'b', label: 'Option B' },
]

const groupedOptions = [
  {
    label: 'Group 1',
    options: [
      { value: 'a', label: 'Option A' },
      { value: 'b', label: 'Option B' },
    ],
  },
  {
    label: 'Group 2',
    options: [
      { value: 'c', label: 'Option C' },
    ],
  },
]

describe('Select', () => {
  it('renders without crashing', () => {
    render(<Select options={options} />)
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('renders label', () => {
    render(<Select label="Choose" options={options} />)
    expect(screen.getByText('Choose')).toBeInTheDocument()
  })

  it('renders all options', () => {
    render(<Select options={options} />)
    expect(screen.getAllByRole('option')).toHaveLength(2)
  })

  it('displays option labels', () => {
    render(<Select options={options} />)
    expect(screen.getByText('Option A')).toBeInTheDocument()
    expect(screen.getByText('Option B')).toBeInTheDocument()
  })

  it('renders grouped options with optgroup', () => {
    render(<Select options={groupedOptions} />)
    expect(screen.getAllByRole('group')).toHaveLength(2)
    expect(screen.getAllByRole('option')).toHaveLength(3)
    expect(screen.getByText('Option C')).toBeInTheDocument()
  })
})
