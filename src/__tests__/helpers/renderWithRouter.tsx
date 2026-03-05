import { render, RenderOptions } from '@testing-library/react';
import { ReactElement, ReactNode } from 'react';
import { HashRouter } from 'react-router-dom';

interface WrapperProps {
  children: ReactNode;
}

/**
 * Custom render function that wraps components with HashRouter
 * Use this for components that use React Router hooks (useNavigate, useParams, etc.)
 */
export function renderWithRouter(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  const Wrapper = ({ children }: WrapperProps) => (
    <HashRouter>{children}</HashRouter>
  );

  return render(ui, { wrapper: Wrapper, ...options });
}

/**
 * Custom render with initial route
 */
export function renderWithRouterAndRoute(
  ui: ReactElement,
  { route = '/' }: { route?: string } = {}
) {
  window.location.hash = route;
  return renderWithRouter(ui);
}
