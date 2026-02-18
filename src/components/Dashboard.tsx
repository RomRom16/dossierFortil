import { useState } from 'react';
import { UserHeader } from './UserHeader';
import { CandidatesList } from './CandidatesList';
import { CandidateDetails } from './CandidateDetails';
import { DossierView } from './DossierView';
import ProfileForm from './ProfileForm';

type ViewState =
  | { type: 'LIST' }
  | { type: 'DETAILS'; candidateId: string }
  | { type: 'CREATE_DOSSIER'; candidateId: string; candidateName: string }
  | { type: 'DOSSIER'; profileId: string; candidateId: string };

export function Dashboard() {
  const [view, setView] = useState<ViewState>({ type: 'LIST' });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pb-20">
      <UserHeader />

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
            onSelectDossier={(profileId) => setView({ type: 'DOSSIER', profileId, candidateId: view.candidateId })}
            onCreateDossier={(name) => setView({ type: 'CREATE_DOSSIER', candidateId: view.candidateId, candidateName: name })}
          />
        )}

        {view.type === 'DOSSIER' && (
          <DossierView
            profileId={view.profileId}
            onBack={() => setView({ type: 'DETAILS', candidateId: view.candidateId })}
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
      </div>
    </div>
  );
}