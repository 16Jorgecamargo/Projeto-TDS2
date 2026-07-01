import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { App } from './App';

describe('App shell', () => {
  it('renders the layout header around routed content', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<App />}>
            <Route path="/" element={<div>home content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByText('home content')).toBeInTheDocument();
  });
});
