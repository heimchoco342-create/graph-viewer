import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CircleNode } from './CircleNode';

// Minimal mock for ReactFlow Handle
vi.mock('@xyflow/react', () => ({
  Handle: () => null,
  Position: { Top: 'top', Bottom: 'bottom' },
}));

describe('CircleNode', () => {
  const baseProps = {
    id: '1',
    data: { label: 'TestNode', color: '#3b82f6' },
    type: 'circle',
    selected: false,
    isConnectable: true,
    zIndex: 0,
    xPos: 0,
    yPos: 0,
    dragging: false,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
  } as any;

  it('renders the label', () => {
    render(<CircleNode {...baseProps} />);
    expect(screen.getByText('TestNode')).toBeInTheDocument();
  });

  it('applies the color as background on the circle element', () => {
    const { container } = render(<CircleNode {...baseProps} />);
    const circle = container.querySelector('[title="TestNode"]') as HTMLElement;
    expect(circle.style.borderRadius).toBe('50%');
    expect(circle.style.background).toBe('rgb(59, 130, 246)');
  });

  it('uses fallback color when color is not provided', () => {
    const props = {
      ...baseProps,
      data: { label: 'NoColor' },
    };
    const { container } = render(<CircleNode {...props} />);
    const circle = container.querySelector('[title="NoColor"]') as HTMLElement;
    expect(circle.style.background).toBe('rgb(107, 114, 128)');
  });

  it('shows label as tooltip on the circle', () => {
    const { container } = render(<CircleNode {...baseProps} />);
    const circle = container.querySelector('[title="TestNode"]');
    expect(circle).toBeTruthy();
  });
});
