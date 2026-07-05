import { useState, type JSX } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useScroll, useMotionValueEvent } from 'framer-motion';
import { NotificationBell } from '../../features/notifications/components/NotificationBell';
import { ProfileMenu } from './ProfileMenu';
import { TopbarSearch } from './TopbarSearch';
import { Button } from '../ui/Button';
import { useAuthStore } from '../../stores/auth';
import { cn } from '../../lib/utils';

const SCROLL_THRESHOLD = 8;

export function Topbar(): JSX.Element {
  const user = useAuthStore((state) => state.user);
  const location = useLocation();
  const isLanding = location.pathname === '/';
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, 'change', (latest) => {
    const isPastThreshold = latest > SCROLL_THRESHOLD;
    setScrolled((prev) => (prev === isPastThreshold ? prev : isPastThreshold));
  });

  const isTransparent = !user && isLanding && !scrolled;

  return (
    <header
      className={cn(
        'sticky top-0 z-sticky transition-colors',
        isTransparent ? 'bg-transparent' : 'border-b border-border bg-bg',
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-app items-center gap-4 px-4">
        <Link to="/" className="flex-1 text-lg font-bold text-ink">
          Services Marketplace
        </Link>
        {!user && isLanding ? (
          <a
            href="#como-funciona"
            className="hidden text-sm font-semibold text-ink hover:text-primary sm:inline-flex"
          >
            Como funciona
          </a>
        ) : null}
        {user ? (
          <>
            <TopbarSearch />
            <NotificationBell />
            <ProfileMenu />
          </>
        ) : (
          <>
            <Link to="/login" className="text-sm font-semibold text-ink hover:text-primary">
              Entrar
            </Link>
            <Button asChild variant="primary" size="sm">
              <Link to="/register">Registrar</Link>
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
