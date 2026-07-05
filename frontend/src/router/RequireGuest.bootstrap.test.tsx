import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RequireGuest } from './RequireGuest';
import { useAuthStore } from '../stores/auth';
import { bootstrapSession } from '../features/auth/bootstrap';

function renderAt(initial: string) {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route element={<RequireGuest />}>
          <Route path="/login" element={<div>login form</div>} />
        </Route>
        <Route path="/" element={<div>home page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RequireGuest cold load bootstrap', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isBootstrapping: true,
    });
  });

  it('sai do estado em branco assim que bootstrapSession resolve, sem depender de App montar', async () => {
    const { container } = renderAt('/login');
    expect(container).toBeEmptyDOMElement();

    await act(async () => {
      await bootstrapSession();
    });

    await waitFor(() => expect(screen.getByText('login form')).toBeInTheDocument());
  });
});
