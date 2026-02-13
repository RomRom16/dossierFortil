import { useState } from 'react';
import { UserHeader } from './UserHeader';
import ProfileForm from './ProfileForm';
import ProfilesList from './ProfilesList';
import { FileText, List } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function Dashboard() {
  const [view, setView] = useState<'form' | 'list'>('list');
  const { isBusinessManager, isAdmin } = useAuth();
  const canManageCandidates = isBusinessManager || isAdmin;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <UserHeader />

      {/* Role info */}
      <div className="max-w-7xl mx-auto px-4 pt-4">
        <div className="flex items-center justify-between text-xs md:text-sm text-gray-600">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            {isAdmin
              ? 'Rôle : Administrateur'
              : isBusinessManager
                ? 'Rôle : Business Manager'
                : 'Rôle : Consultant'}
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1">
            <button
              onClick={() => setView('list')}
              className={`flex items-center gap-2 px-6 py-4 font-medium border-b-2 transition-colors ${
                view === 'list'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              <List className="w-5 h-5" />
              {canManageCandidates ? 'Mes candidats' : 'Mes dossiers de compétences'}
            </button>
            <button
              onClick={() => setView('form')}
              className={`flex items-center gap-2 px-6 py-4 font-medium border-b-2 transition-colors ${
                view === 'form'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              <FileText className="w-5 h-5" />
              {canManageCandidates ? 'Nouveau candidat' : 'Nouveau dossier'}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {view === 'form' ? (
        <ProfileForm onViewProfiles={() => setView('list')} />
      ) : (
        <ProfilesList onBack={() => setView('form')} />
      )}
    </div>
  );
}
