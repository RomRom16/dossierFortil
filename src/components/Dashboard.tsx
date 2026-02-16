import { useState } from 'react';
import { UserHeader } from './UserHeader';
import { CandidatesList } from './CandidatesList';
import { CandidateDetails } from './CandidateDetails';
import ProfileForm from './ProfileForm';
import { AdminPanel } from './AdminPanel';
import { useAuth } from '../contexts/AuthContext';

type ViewState =
  | { type: 'LIST' }
  | { type: 'DETAILS'; candidateId: string }
  | { type: 'CREATE_DOSSIER'; candidateId: string; candidateName: string }
  | { type: 'ADMIN' };

export function Dashboard() {
  const [view, setView] = useState<ViewState>({ type: 'LIST' });
  const { user, isAdmin } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pb-20">
      <UserHeader
        onNavigateDashboard={() => setView({ type: 'LIST' })}
        onNavigateAdmin={isAdmin ? () => setView({ type: 'ADMIN' }) : undefined}
      />

      {/* Dynamic Content */}
      <div className="pt-6">
        {view.type === 'LIST' && (
          <CandidatesList
            onSelectCandidate={(id) => setView({ type: 'DETAILS', candidateId: id })}
          />
        )}

        {view.type === 'DETAILS' && (
          <CandidateDetails
            candidateId={view.candidateId}
            onBack={() => setView({ type: 'LIST' })}
            onCreateDossier={(name) => setView({ type: 'CREATE_DOSSIER', candidateId: view.candidateId, candidateName: name })}
          />
        )}

        {view.type === 'CREATE_DOSSIER' && (
          <ProfileForm
            candidateId={view.candidateId}
            candidateName={view.candidateName}
            onCancel={() => setView({ type: 'DETAILS', candidateId: view.candidateId })}
            onSuccess={() => setView({ type: 'DETAILS', candidateId: view.candidateId })}
          />
        )}

        {view.type === 'ADMIN' && (
          <AdminPanel onBack={() => setView({ type: 'LIST' })} />
        )}
      </div>
    </div>
  );
}
