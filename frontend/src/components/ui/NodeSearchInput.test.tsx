import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NodeSearchInput } from './NodeSearchInput';

const MOCK_NODES = [
  { id: '1', name: '김철수', type: 'person' },
  { id: '2', name: '이영희', type: 'person' },
  { id: '3', name: 'FastAPI', type: 'tech' },
  { id: '4', name: 'React', type: 'tech' },
  { id: '5', name: '백엔드팀', type: 'team' },
];

describe('NodeSearchInput', () => {
  it('renders with label and placeholder', () => {
    render(
      <NodeSearchInput
        label="출발 노드"
        placeholder="검색..."
        nodes={MOCK_NODES}
        value=""
        onChange={() => {}}
      />,
    );
    expect(screen.getByText('출발 노드')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('검색...')).toBeInTheDocument();
  });

  it('shows suggestions on focus', () => {
    render(
      <NodeSearchInput nodes={MOCK_NODES} value="" onChange={() => {}} />,
    );
    fireEvent.focus(screen.getByRole('textbox'));
    // Should show some nodes
    expect(screen.getByText('김철수')).toBeInTheDocument();
    expect(screen.getByText('FastAPI')).toBeInTheDocument();
  });

  it('filters suggestions by query', () => {
    render(
      <NodeSearchInput nodes={MOCK_NODES} value="" onChange={() => {}} />,
    );
    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '김' } });

    expect(screen.getByText('김철수')).toBeInTheDocument();
    expect(screen.queryByText('이영희')).not.toBeInTheDocument();
  });

  it('filters by type', () => {
    render(
      <NodeSearchInput nodes={MOCK_NODES} value="" onChange={() => {}} />,
    );
    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'tech' } });

    expect(screen.getByText('FastAPI')).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.queryByText('김철수')).not.toBeInTheDocument();
  });

  it('calls onChange when suggestion selected', () => {
    const onChange = vi.fn();
    render(
      <NodeSearchInput nodes={MOCK_NODES} value="" onChange={onChange} />,
    );
    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    fireEvent.click(screen.getByText('김철수'));

    expect(onChange).toHaveBeenCalledWith('1');
  });

  it('shows selected node name in input', () => {
    render(
      <NodeSearchInput nodes={MOCK_NODES} value="3" onChange={() => {}} />,
    );
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe('FastAPI');
  });

  it('shows no results message', () => {
    render(
      <NodeSearchInput nodes={MOCK_NODES} value="" onChange={() => {}} />,
    );
    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'zzzzz' } });

    expect(screen.getByText('결과 없음')).toBeInTheDocument();
  });

  it('navigates suggestions with ArrowDown/ArrowUp', () => {
    render(
      <NodeSearchInput nodes={MOCK_NODES} value="" onChange={() => {}} />,
    );
    const input = screen.getByRole('textbox');
    fireEvent.focus(input);

    // ArrowDown highlights first item
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    const options = screen.getAllByRole('option');
    expect(options[0]).toHaveAttribute('aria-selected', 'true');

    // ArrowDown again highlights second
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(options[0]).toHaveAttribute('aria-selected', 'false');
    expect(options[1]).toHaveAttribute('aria-selected', 'true');

    // ArrowUp goes back to first
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('selects highlighted item with Enter', () => {
    const onChange = vi.fn();
    render(
      <NodeSearchInput nodes={MOCK_NODES} value="" onChange={onChange} />,
    );
    const input = screen.getByRole('textbox');
    fireEvent.focus(input);

    // Navigate to first item and press Enter
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith('1');
  });

  it('closes dropdown with Escape', () => {
    render(
      <NodeSearchInput nodes={MOCK_NODES} value="" onChange={() => {}} />,
    );
    const input = screen.getByRole('textbox');
    fireEvent.focus(input);

    expect(screen.getByText('김철수')).toBeInTheDocument();

    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('wraps around when navigating past last/first item', () => {
    render(
      <NodeSearchInput nodes={MOCK_NODES} value="" onChange={() => {}} />,
    );
    const input = screen.getByRole('textbox');
    fireEvent.focus(input);

    // ArrowUp from -1 wraps to last item
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    const options = screen.getAllByRole('option');
    expect(options[options.length - 1]).toHaveAttribute('aria-selected', 'true');
  });
});
