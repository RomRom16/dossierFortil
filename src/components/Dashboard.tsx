import { useState, useEffect } from 'react';
import { UserHeader } from './UserHeader';
import { CandidatesList } from './CandidatesList';
import { CandidateDetails } from './CandidateDetails';
import ProfileForm from './ProfileForm';
import { AdminPanel } from './AdminPanel';
import { useAuth } from '../contexts/AuthContext';
import { apiGetMyCandidate } from '../lib/api';

type ViewState =
  | { type: 'LIST' }
  | { type: 'DETAILS'; candidateId: string }
  | { type: 'CREATE_DOSSIER'; candidateId: string; candidateName: string }
  | { type: 'ADMIN' }
  | { type: 'MY_PROFILE'; selfCandidateId: string };

export function Dashboard() {
  const { user, isAdmin, isBusinessManager } = useAuth();
  const isConsultantOnly = !isAdmin && !isBusinessManager;

  const [view, setView] = useState<ViewState>({ type: isConsultantOnly ? 'MY_PROFILE' : 'LIST' } as ViewState);

  // Pour les consultants, on récupère leur propre profil candidat au chargement
  useEffect(() => {
    if (isConsultantOnly && view.type === 'LIST') {
      // Si par erreur on est en LIST, on repousse vers MY_PROFILE
      (async () => {
        try {
          const self = await apiGetMyCandidate(user!);
          setView({ type: 'MY_PROFILE', selfCandidateId: self.id });
        } catch (e) {
          console.error("Erreur lors de la récupération du profil personnel", e);
        }
      })();
    }

    if (isConsultantOnly && view.type === 'MY_PROFILE' && !('selfCandidateId' in view)) {
      (async () => {
        try {
          const self = await apiGetMyCandidate(user!);
          setView({ type: 'MY_PROFILE', selfCandidateId: self.id });
        } catch (e) {
          console.error("Erreur lors de la récupération du profil personnel", e);
        }
      })();
    }
  }, [isConsultantOnly, view.type, user]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pb-20">
      <UserHeader
        onNavigateDashboard={() => setView({ type: isConsultantOnly ? 'MY_PROFILE' : 'LIST' } as ViewState)}
        onNavigateAdmin={isAdmin ? () => setView({ type: 'ADMIN' }) : undefined}
      />

      {/* Dynamic Content */}
      <div className="pt-6">
        {view.type === 'LIST' && (
          <CandidatesList
            onSelectCandidate={(id) => setView({ type: 'DETAILS', candidateId: id })}
          />
        )}

        {(view.type === 'DETAILS' || view.type === 'MY_PROFILE') && (
          <CandidateDetails
            candidateId={view.type === 'DETAILS' ? view.candidateId : (view as any).selfCandidateId}
            onBack={isConsultantOnly ? undefined : () => setView({ type: 'LIST' })}
            onCreateDossier={(name) => setView({
              type: 'CREATE_DOSSIER',
              candidateId: view.type === 'DETAILS' ? view.candidateId : (view as any).selfCandidateId,
              candidateName: name
            })}
          />
        )}

        {view.type === 'CREATE_DOSSIER' && (
          <ProfileForm
            candidateId={view.candidateId}
            candidateName={view.candidateName}
            onCancel={() => setView({
              type: isConsultantOnly ? 'MY_PROFILE' : 'DETAILS',
              candidateId: view.candidateId,
              selfCandidateId: view.candidateId
            } as any)}
            onSuccess={() => setView({
              type: isConsultantOnly ? 'MY_PROFILE' : 'DETAILS',
              candidateId: view.candidateId,
              selfCandidateId: view.candidateId
            } as any)}
          />
        )}

        {view.type === 'ADMIN' && (
          <AdminPanel onBack={() => setView({ type: isConsultantOnly ? 'MY_PROFILE' : 'LIST' } as any)} />
        )}
      </div>
    </div>
  );
}
