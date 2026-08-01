import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PageHeader } from './PageHeader';

describe('PageHeader', () => {
  it('renders <h1> with the title', () => {
    render(<MemoryRouter><PageHeader title="Hub" /></MemoryRouter>);
    expect(screen.getByRole('heading', { level: 1, name: 'Hub' })).toBeInTheDocument();
  });
  it('renders breadcrumbs and actions slot', () => {
    render(<MemoryRouter><PageHeader title="X" breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'X' }]} actions={<button>Do</button>} /></MemoryRouter>);
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Do' })).toBeInTheDocument();
  });
});
