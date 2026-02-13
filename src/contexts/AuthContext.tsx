import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { AppUser } from '../lib/api';
import { apiGetMe } from '../lib/api';

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  roles: string[];
  isBusinessManager: boolean;
  isAdmin: boolean;
  signInWithMicrosoft: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<string[]>([]);

  const STORAGE_KEY = 'auth_user_v1';

  const loadUserRoles = async (currentUser: AppUser) => {
    try {
      const { roles: loadedRoles } = await apiGetMe(currentUser);
      setRoles(loadedRoles);
    } catch (error) {
      console.error('Erreur inattendue lors du chargement des rôles utilisateur:', error);
      setRoles([]);
    }
  };

  useEffect(() => {
    const stored = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!stored) {
      setLoading(false);
      return;
    }

    try {
      const parsed = JSON.parse(stored) as AppUser;
      setUser(parsed);
      loadUserRoles(parsed).finally(() => setLoading(false));
    } catch (error) {
      console.error('Erreur lors du chargement de la session depuis le stockage local:', error);
      setUser(null);
      setRoles([]);
      setLoading(false);
    }
  }, []);

  const signInWithMicrosoft = async () => {
    throw new Error('Connexion Microsoft non configurée avec le backend actuel.');
  };

  const signInWithEmail = async (email: string, password: string) => {
    if (!email) {
      throw new Error('Email requis');
    }

    // Auth simplifiée : on génère un identifiant local par navigateur
    const existing = globalThis.localStorage?.getItem(STORAGE_KEY);
    let newUser: AppUser | null = null;

    if (existing) {
      try {
        const parsed = JSON.parse(existing) as AppUser;
        if (parsed.email === email) {
          newUser = parsed;
        }
      } catch {
        // ignore parsing error, on régénère
      }
    }

    if (!newUser) {
      const id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

      newUser = {
        id,
        email,
        full_name: email.split('@')[0] || email,
      };
    }

    setUser(newUser);
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(newUser));
    await loadUserRoles(newUser);
  };

  const signUpWithEmail = async (email: string, password: string) => {
    // Pour l'instant, inscription = connexion directe
    await signInWithEmail(email, password);
  };

  const signOut = async () => {
    setUser(null);
    setRoles([]);
    globalThis.localStorage?.removeItem(STORAGE_KEY);
  };

  const value: AuthContextType = useMemo(
    () => ({
      user,
      loading,
      roles,
      isBusinessManager: roles.includes('business_manager'),
      isAdmin: roles.includes('admin'),
      signInWithMicrosoft,
      signInWithEmail,
      signUpWithEmail,
      signOut,
    }),
    [user, loading, roles],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth doit être utilisé dans AuthProvider');
  }
  return context;
}
