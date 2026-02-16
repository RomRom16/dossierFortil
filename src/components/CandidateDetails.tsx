import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, FileText, Calendar, Mail, Phone, Briefcase, Trash2, Edit2, Check, X as XIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { apiGetCandidateDetails, apiDeleteCandidate, apiUpdateCandidate, apiDeleteProfile, type CandidateWithProfiles, type ProfileWithDetails } from '../lib/api';
import { DossierCard } from './DossierCard';
import { ConfirmDialog } from './ConfirmDialog';

type Props = {
    candidateId: string;
    onBack?: () => void;
    onCreateDossier: (name: string) => void;
};

export function CandidateDetails({ candidateId, onBack, onCreateDossier }: Props) {
    const { user, isAdmin, isBusinessManager } = useAuth();
    const [data, setData] = useState<CandidateWithProfiles | null>(null);
    const canManage = isAdmin || isBusinessManager || (data?.email === user?.email);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({ full_name: '', email: '', phone: '' });

    // Modal state for Candidate Deletion
    const [showDeleteCandidateConfirm, setShowDeleteCandidateConfirm] = useState(false);

    // Modal state for Dossier Deletion
    const [dossierToDelete, setDossierToDelete] = useState<ProfileWithDetails | null>(null);

    useEffect(() => {
        if (user && candidateId) loadDetails();
    }, [user, candidateId]);

    const loadDetails = async () => {
        try {
            setLoading(true);
            const res = await apiGetCandidateDetails(user!, candidateId);
            setData(res);
            setEditForm({
                full_name: res.full_name,
                email: res.email || '',
                phone: res.phone || ''
            });
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteCandidate = async () => {
        try {
            await apiDeleteCandidate(user!, candidateId);
            setShowDeleteCandidateConfirm(false);
            onBack?.();
        } catch (err) {
            setShowDeleteCandidateConfirm(false);
            alert('Erreur: Impossible de supprimer ce candidat. Vérifiez que vous avez les droits nécessaires.');
            console.error(err);
        }
    };

    const handleDeleteDossier = async () => {
        if (!dossierToDelete) return;
        try {
            await apiDeleteProfile(user!, dossierToDelete.id);
            // Update local state
            setData(prev => prev ? ({ ...prev, profiles: prev.profiles.filter(p => p.id !== dossierToDelete.id) }) : null);
            setDossierToDelete(null);
        } catch (err) {
            setDossierToDelete(null);
            alert('Erreur lors de la suppression du dossier');
            console.error(err);
        }
    };

    const handleUpdateCandidate = async () => {
        try {
            await apiUpdateCandidate(user!, candidateId, {
                full_name: editForm.full_name,
                email: editForm.email,
                phone: editForm.phone
            });
            setIsEditing(false);
            loadDetails(); // Reload to get fresh data
        } catch (err) {
            alert('Erreur lors de la mise à jour');
            console.error(err);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Chargement du profil...</div>;
    if (!data) return <div className="p-8 text-center text-red-500">Candidat introuvable</div>;

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 relative">
            {/* Candidate Delete Confirmation */}
            <ConfirmDialog
                isOpen={showDeleteCandidateConfirm}
                title="Supprimer le candidat ?"
                message={`Êtes-vous sûr de vouloir supprimer définitivement ${data.full_name} ? Cette action supprimera également tous ses dossiers de compétences associés.`}
                confirmLabel="Supprimer définitivement"
                isDangerous={true}
                onConfirm={handleDeleteCandidate}
                onCancel={() => setShowDeleteCandidateConfirm(false)}
            />

            {/* Dossier Delete Confirmation */}
            <ConfirmDialog
                isOpen={!!dossierToDelete}
                title="Supprimer le dossier ?"
                message={dossierToDelete ? `Êtes-vous sûr de vouloir supprimer le dossier "${dossierToDelete.full_name}" ?` : ''}
                confirmLabel="Supprimer le dossier"
                isDangerous={true}
                onConfirm={handleDeleteDossier}
                onCancel={() => setDossierToDelete(null)}
            />

            {onBack && (
                <button
                    onClick={onBack}
                    className="mb-6 flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Retour aux candidats
                </button>
            )}

            {/* Header Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-8">
                <div className="h-32 bg-gradient-to-r from-orange-400 to-orange-600 relative">
                    <div className="absolute -bottom-10 left-8">
                        <div className="w-24 h-24 rounded-full border-4 border-white bg-white shadow-md flex items-center justify-center text-3xl font-bold text-orange-600">
                            {data.full_name.charAt(0).toUpperCase()}
                        </div>
                    </div>
                    <div className="absolute top-4 right-4 flex gap-2">
                        {!isEditing ? (
                            <>
                                {canManage && (
                                    <>
                                        <button
                                            onClick={() => setIsEditing(true)}
                                            className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg text-sm font-medium backdrop-blur-sm flex items-center gap-2 transition-colors"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                            Modifier
                                        </button>
                                        <button
                                            onClick={() => setShowDeleteCandidateConfirm(true)}
                                            className="bg-white/20 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium backdrop-blur-sm flex items-center gap-2 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Supprimer
                                        </button>
                                    </>
                                )}
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={handleUpdateCandidate}
                                    className="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium shadow-sm flex items-center gap-2 transition-colors"
                                >
                                    <Check className="w-4 h-4" />
                                    Enregistrer
                                </button>
                                <button
                                    onClick={() => { setIsEditing(false); setEditForm({ full_name: data.full_name, email: data.email || '', phone: data.phone || '' }); }}
                                    className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg text-sm font-medium backdrop-blur-sm flex items-center gap-2 transition-colors"
                                >
                                    <XIcon className="w-4 h-4" />
                                    Annuler
                                </button>
                            </>
                        )}
                    </div>
                </div>
                <div className="pt-12 px-8 pb-8">
                    <div className="flex justify-between items-start">
                        <div className="w-full max-w-lg">
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={editForm.full_name}
                                    onChange={e => setEditForm({ ...editForm, full_name: e.target.value })}
                                    className="text-3xl font-bold text-gray-900 w-full border-b-2 border-orange-500 focus:outline-none mb-2"
                                />
                            ) : (
                                <h1 className="text-3xl font-bold text-gray-900">{data.full_name}</h1>
                            )}

                            <p className="text-gray-500 mt-1 flex items-center gap-4">
                                <span className="flex items-center gap-1.5">
                                    <Calendar className="w-4 h-4" />
                                    Ajouté le {new Date(data.created_at).toLocaleDateString()}
                                </span>
                            </p>
                        </div>
                        {canManage && (
                            <button
                                onClick={() => onCreateDossier(data.full_name)}
                                className="btn-primary flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Nouveau Dossier
                            </button>
                        )}
                    </div>

                    {/* Meta Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 p-6 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                                <Mail className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs text-gray-500 uppercase font-semibold">Email</p>
                                {isEditing ? (
                                    <input
                                        type="email"
                                        value={editForm.email}
                                        onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                                        className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                                        placeholder="email@example.com"
                                    />
                                ) : (
                                    <p className="text-gray-900 font-medium">{data.email || 'Non renseigné'}</p>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
                                <Phone className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs text-gray-500 uppercase font-semibold">Téléphone</p>
                                {isEditing ? (
                                    <input
                                        type="tel"
                                        value={editForm.phone}
                                        onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                                        className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                                        placeholder="+33 6 ..."
                                    />
                                ) : (
                                    <p className="text-gray-900 font-medium">{data.phone || 'Non renseigné'}</p>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">
                                <FileText className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-semibold">Dossiers</p>
                                <p className="text-gray-900 font-medium">{data.profiles.length} actifs</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Dossiers List */}
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-orange-500" />
                Dossiers de compétences
            </h2>

            {data.profiles.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                    <p className="text-gray-500">Aucun dossier créé pour ce candidat.</p>
                    {canManage && (
                        <button onClick={() => onCreateDossier(data.full_name)} className="text-orange-600 font-medium mt-2 hover:underline">
                            Créer le premier dossier
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-6">
                    {data.profiles.map(p => (
                        <DossierCard
                            key={p.id}
                            profile={p}
                            onDeleteClick={canManage ? setDossierToDelete : undefined}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
