import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiAdminListUsers, apiAdminUpdateUserRoles, type AdminUser } from '../lib/api';
import { Shield, User, Check, Loader2, ArrowLeft } from 'lucide-react';

type Props = {
    onBack: () => void;
};

export function AdminPanel({ onBack }: Props) {
    const { user } = useAuth();
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const data = await apiAdminListUsers(user!);
            setUsers(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const toggleRole = async (targetUser: AdminUser, role: string) => {
        setUpdatingId(targetUser.id);
        try {
            const currentRoles = targetUser.roles;
            const newRoles = currentRoles.includes(role)
                ? currentRoles.filter(r => r !== role)
                : [...currentRoles, role];

            await apiAdminUpdateUserRoles(user!, targetUser.id, newRoles);

            // Update local state
            setUsers(prev => prev.map(u => u.id === targetUser.id ? { ...u, roles: newRoles } : u));
        } catch (err) {
            alert("Erreur lors de la mise à jour des rôles");
        } finally {
            setUpdatingId(null);
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-orange-500 animate-spin mb-4" />
            <p className="text-gray-500">Chargement des utilisateurs...</p>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            <button
                onClick={onBack}
                className="mb-6 flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                Retour au tableau de bord
            </button>

            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-orange-100 rounded-xl text-orange-600">
                    <Shield className="w-8 h-8" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Administration</h1>
                    <p className="text-gray-500">Gérez les utilisateurs et leurs permissions</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-6 py-4 text-sm font-semibold text-gray-600">Utilisateur</th>
                            <th className="px-6 py-4 text-sm font-semibold text-gray-600 text-center">Consultant</th>
                            <th className="px-6 py-4 text-sm font-semibold text-gray-600 text-center">Business Manager</th>
                            <th className="px-6 py-4 text-sm font-semibold text-gray-600 text-center">Admin</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {users.map(u => (
                            <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold">
                                            {u.full_name?.charAt(0).toUpperCase() || <User className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">{u.full_name || 'Inconnu'}</p>
                                            <p className="text-sm text-gray-500">{u.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <RoleCheckbox
                                        isActive={u.roles.includes('consultant')}
                                        isLoading={updatingId === u.id}
                                        onClick={() => toggleRole(u, 'consultant')}
                                    />
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <RoleCheckbox
                                        isActive={u.roles.includes('business_manager')}
                                        isLoading={updatingId === u.id}
                                        onClick={() => toggleRole(u, 'business_manager')}
                                    />
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <RoleCheckbox
                                        isActive={u.roles.includes('admin')}
                                        isLoading={updatingId === u.id}
                                        isDangerous
                                        onClick={() => toggleRole(u, 'admin')}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function RoleCheckbox({ isActive, onClick, isLoading, isDangerous }: { isActive: boolean; onClick: () => void; isLoading: boolean; isDangerous?: boolean }) {
    return (
        <button
            disabled={isLoading}
            onClick={onClick}
            className={`
                w-10 h-10 rounded-lg flex items-center justify-center transition-all mx-auto
                ${isActive
                    ? (isDangerous ? 'bg-red-500 text-white shadow-lg shadow-red-200' : 'bg-orange-500 text-white shadow-lg shadow-orange-200')
                    : 'bg-slate-100 text-slate-300 hover:bg-slate-200'
                }
                ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
        >
            <Check className={`w-6 h-6 transition-transform ${isActive ? 'scale-110' : 'scale-0'}`} />
        </button>
    );
}
