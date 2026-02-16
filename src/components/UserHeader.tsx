import { useAuth } from '../contexts/AuthContext';
import { LogOut, User, Shield, LayoutDashboard } from 'lucide-react';

type Props = {
  onNavigateDashboard?: () => void;
  onNavigateAdmin?: () => void;
};

export function UserHeader({ onNavigateDashboard, onNavigateAdmin }: Props) {
  const { user, signOut, isAdmin, isBusinessManager } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  if (!user) return null;

  return (
    <div className="bg-white shadow-md relative z-10">
      <div className="h-1.5 bg-gradient-to-r from-orange-500 via-green-500 to-cyan-500"></div>

      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <img src="/fortil-logo.svg" alt="Fortil" className="h-10 cursor-pointer" onClick={onNavigateDashboard} />

          <nav className="flex items-center gap-1 ml-4">
            {onNavigateDashboard && (
              <button
                onClick={onNavigateDashboard}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors text-sm font-medium"
              >
                {isAdmin || isBusinessManager ? (
                  <>
                    <LayoutDashboard className="w-4 h-4" />
                    Tableau de bord
                  </>
                ) : (
                  <>
                    <User className="w-4 h-4" />
                    Mon Profil
                  </>
                )}
              </button>
            )}

            {isAdmin && onNavigateAdmin && (
              <button
                onClick={onNavigateAdmin}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors text-sm font-medium"
              >
                <Shield className="w-4 h-4" />
                Administration
              </button>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center shadow-md">
              <User className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:flex flex-col">
              <p className="font-semibold text-gray-900 text-sm">
                {user.full_name || user.email.split('@')[0]}
              </p>
              <p className="text-gray-500 text-xs">{user.email}</p>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors text-sm font-medium border border-gray-300 hover:border-orange-300"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Déconnexion</span>
          </button>
        </div>
      </div>
    </div>
  );
}
