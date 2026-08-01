import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RoleSimulator } from './RoleSimulator';

describe('RoleSimulator', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_ENABLE_ROLE_SIMULATOR', 'false');
  });
  
  it('returns null when flag not set', () => {
    const { container } = render(<RoleSimulator />);
    expect(container.firstChild).toBeNull();
  });
  
  it('renders three role buttons when flag=true', () => {
    vi.stubEnv('VITE_ENABLE_ROLE_SIMULATOR', 'true');
    render(<RoleSimulator />);
    expect(screen.getByRole('button', { name: 'freelancer' })).toBeInTheDocument();
  });
});
