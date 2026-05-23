import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  FieldContainer,
  MutedMetadata,
  PanelContainer,
  PrimaryActionButton,
  ResultCard,
} from '../base/surface';

describe('surface primitives', () => {
  it('applies shared panel styling and caller classes', () => {
    render(<PanelContainer className="custom-panel">Panel content</PanelContainer>);

    const panel = screen.getByText('Panel content');
    expect(panel).toHaveClass('bg-surface-panel');
    expect(panel).toHaveClass('border-surface-border');
    expect(panel).toHaveClass('shadow-[var(--shadow-panel)]');
    expect(panel).toHaveClass('custom-panel');
  });

  it('applies shared field styling', () => {
    render(<FieldContainer>Field content</FieldContainer>);

    const field = screen.getByText('Field content');
    expect(field).toHaveClass('bg-surface-field');
    expect(field).toHaveClass('border-surface-border');
    expect(field).toHaveClass('rounded-[14px]');
  });

  it('applies shared result card styling', () => {
    render(<ResultCard>Flight option</ResultCard>);

    const card = screen.getByText('Flight option');
    expect(card).toHaveClass('bg-surface-panel');
    expect(card).toHaveClass('rounded-xl');
    expect(card).toHaveClass('transition-all');
  });

  it('applies shared muted metadata styling', () => {
    render(<MutedMetadata>Meta copy</MutedMetadata>);

    expect(screen.getByText('Meta copy')).toHaveClass('text-copy-muted', 'text-xs');
  });

  it('renders a clickable primary action button', () => {
    const handleClick = vi.fn();

    render(<PrimaryActionButton onClick={handleClick}>Search</PrimaryActionButton>);
    const button = screen.getByRole('button', { name: 'Search' });

    expect(button).toHaveClass('from-brand');
    expect(button).toHaveClass('to-brand-bright');

    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
