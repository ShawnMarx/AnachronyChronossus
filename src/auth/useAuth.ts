// useAuth.ts — small React context around the optional BGE login.
//
// Wrap the app in <AuthProvider>; read state anywhere with useAuth(). Logging
// in never gates gameplay — it only unlocks additive features (history/stats).

import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { fetchMe, startLogin, startLogout, type BgeUser } from './bgeAuth';

interface AuthContextValue {
  user: BgeUser | null;
  loading: boolean;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<BgeUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetchMe().then((u) => {
      if (alive) {
        setUser(u);
        setLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const value: AuthContextValue = {
    user,
    loading,
    login: startLogin,
    logout: startLogout,
  };

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
