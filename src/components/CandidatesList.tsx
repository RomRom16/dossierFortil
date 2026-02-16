import { useState, useEffect } from 'react';
import { Plus, Search, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { apiListCandidates, apiCreateCandidate, type Candidate } from '../lib/api';
import { CandidateCard } from './CandidateCard';

type Props = {
    onSelectCandidate: (id: string) => void;
};

export function CandidatesList({ onSelectCandidate }: Props) {
    const { user, isAdmin, isBusinessManager } = useAuth();
    const canCreate = isAdmin || isBusinessManager;
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newCandidateName, setNewCandidateName] = useState('');

    useEffect(() => {
        if (user) loadCandidates();
    }, [user]);

    const loadCandidates = async () => {
        try {
            setLoading(true);
            const data = await apiListCandidates(user!);
            setCandidates(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCandidateName.trim()) return;
        try {
            const { id } = await apiCreateCandidate(user!, { full_name: newCandidateName });
            setShowCreateModal(false);
            setNewCandidateName('');
            await loadCandidates(); // Refresh list
            onSelectCandidate(id); // Auto-open new candidate
        } catch (err) {
            alert("Erreur lors de la création");
        }
    };

    const filtered = candidates.filter(c =>
        c.full_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="p-8 text-center text-gray-500">Chargement des candidats...</div>;

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            {/* Header Actions */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-1">
                        {canCreate ? 'Mes Candidats' : 'Liste des Candidats'}
                    </h1>
                    <p className="text-gray-500">
                        {canCreate ? 'Gérez votre vivier de talents et leurs dossiers' : 'Consultez les dossiers de compétences'}
                    </p>
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Rechercher..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        />
                    </div>
                    {canCreate && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="btn-primary flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Nouveau Candidat
                        </button>
                    )}
                </div>
            </div>

            {/* Grid */}
            {filtered.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
                    <div className="bg-orange-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Users className="w-8 h-8 text-orange-500" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">Aucun candidat trouvé</h3>
                    <p className="text-gray-500 mb-4 font-semibold">
                        {canCreate ? 'Commencez par ajouter votre premier candidat' : "Vous n'avez pas encore de candidat assigné."}
                    </p>
                    {canCreate && (
                        <button onClick={() => setShowCreateModal(true)} className="text-orange-600 font-medium hover:underline">
                            Créer un candidat
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filtered.map(c => (
                        <CandidateCard key={c.id} candidate={c} onClick={() => onSelectCandidate(c.id)} />
                    ))}
                </div>
            )}

            {/* Simple Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-gray-100">
                            <h2 className="text-xl font-bold text-gray-900">Nouveau Candidat</h2>
                        </div>
                        <form onSubmit={handleCreate} className="p-6">
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet</label>
                                <input
                                    autoFocus
                                    type="text"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                                    value={newCandidateName}
                                    onChange={e => setNewCandidateName(e.target.value)}
                                    placeholder="Ex: Jean Dupont"
                                />
                            </div>
                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={!newCandidateName.trim()}
                                    className="btn-primary"
                                >
                                    Créer
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
