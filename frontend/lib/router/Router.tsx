import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';

interface RouterContextValue {
  pathname: string;
  search: string;
  hash: string;
  navigate: (to: string, options?: { replace?: boolean }) => void;
  params: Record<string, string>;
  setParams: (params: Record<string, string>) => void;
}

const RouterContext = createContext<RouterContextValue | null>(null);

const NAVIGATE_EVENT = 'livsportz:navigate';

export interface RouterProps {
  children: ReactNode;
}

export const Router: React.FC<RouterProps> = ({ children }) => {
  const [location, setLocation] = useState(() => ({
    pathname: window.location.pathname,
    search: window.location.search,
    hash: window.location.hash,
  }));
  const [params, setParams] = useState<Record<string, string>>({});

  useEffect(() => {
    const handlePopState = () => {
      setLocation({
        pathname: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash,
      });
    };

    const handleCustomNavigate = () => {
      setLocation({
        pathname: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash,
      });
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener(NAVIGATE_EVENT, handleCustomNavigate);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener(NAVIGATE_EVENT, handleCustomNavigate);
    };
  }, []);

  const navigate = useCallback((to: string, options?: { replace?: boolean }) => {
    if (options?.replace) {
      window.history.replaceState(null, '', to);
    } else {
      window.history.pushState(null, '', to);
    }
    window.dispatchEvent(new Event(NAVIGATE_EVENT));
  }, []);

  const value = useMemo(
    () => ({
      ...location,
      navigate,
      params,
      setParams,
    }),
    [location, navigate, params]
  );

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
};

export const useLocation = () => {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useLocation must be used within a Router');
  }
  return {
    pathname: context.pathname,
    search: context.search,
    hash: context.hash,
  };
};

export const useNavigate = () => {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useNavigate must be used within a Router');
  }
  return context.navigate;
};

export const useParams = <T extends Record<string, string> = Record<string, string>>(): T => {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useParams must be used within a Router');
  }
  return context.params as T;
};

import { matchPath } from './matcher';
export { matchPath };

export interface RouteProps {
  path: string;
  exact?: boolean;
  children?: ReactNode;
  element?: ReactNode;
}

export const Route: React.FC<RouteProps> = ({ path, exact = false, children, element }) => {
  const { pathname, setParams } = useContext(RouterContext) || {
    pathname: window.location.pathname,
    setParams: () => {},
  };

  const { matches, params } = matchPath(path, pathname, exact);

  useEffect(() => {
    if (matches && Object.keys(params).length > 0) {
      setParams(params);
    }
  }, [matches, params, setParams]);

  if (!matches) {
    return null;
  }

  return <>{element || children}</>;
};

export interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  to: string;
  replace?: boolean;
  activeClassName?: string;
}

export const Link: React.FC<LinkProps> = ({
  to,
  replace,
  className = '',
  activeClassName = '',
  children,
  onClick,
  ...rest
}) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const isExactActive = pathname === to;
  const isPrefixActive = to !== '/' && pathname.startsWith(to);
  const isActive = isExactActive || isPrefixActive;

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (onClick) onClick(e);
    if (!e.defaultPrevented && e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      navigate(to, { replace });
    }
  };

  const combinedClass = `${className} ${isActive ? activeClassName : ''}`.trim();

  return (
    <a href={to} onClick={handleClick} className={combinedClass} {...rest}>
      {children}
    </a>
  );
};

export interface NavigateProps {
  to: string;
  replace?: boolean;
}

export const Navigate: React.FC<NavigateProps> = ({ to, replace = true }) => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate(to, { replace });
  }, [navigate, to, replace]);

  return null;
};
