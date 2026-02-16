import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { AppUser } from '../lib/api';
import { apiGetMe, apiSignIn, apiSignUp } from '../lib/api';

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  roles: string[];
  isBusinessManager: boolean;
  isAdmin: boolean;
  signInWithMicrosoft: () => Promise<void>;
  signInWithEmail: (email: string, _password: string) => Promise<void>;
  signUpWithEmail: (email: string, _password: string) => Promise<void>;
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
      console.error('Session invalide ou expirée:', error);
      // Si l'API renvoie une erreur (ex: 401), on vide la session locale
      signOut();
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
      // On vérifie la validité du compte au chargement
      loadUserRoles(parsed).finally(() => setLoading(false));
    } catch (error) {
      console.error('Erreur stockage local:', error);
      signOut();
      setLoading(false);
    }
  }, []);

  const signInWithMicrosoft = async () => {
    throw new Error('Connexion Microsoft non configurée.');
  };

  const signInWithEmail = async (email: string, _password: string) => {
    if (!email) throw new Error('Email requis');

    const normalizedEmail = email.trim().toLowerCase();
    const verifiedUser = await apiSignIn(normalizedEmail);

    setUser(verifiedUser);
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(verifiedUser));
    await loadUserRoles(verifiedUser);
  };

  const signUpWithEmail = async (email: string, _password: string) => {
    if (!email) throw new Error('Email requis');

    const normalizedEmail = email.trim().toLowerCase();
    // Génération d'un ID stable basé sur l'email
    const stableId = 'user_' + btoa(normalizedEmail).replace(/[/+=]/g, '').slice(0, 20);

    const newUser: AppUser = {
      id: stableId,
      email: normalizedEmail,
      full_name: normalizedEmail.split('@')[0],
    };

    // Création sur le backend
    await apiSignUp(newUser);

    // Connexion immédiate après inscription
    setUser(newUser);
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(newUser));
    await loadUserRoles(newUser);
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
