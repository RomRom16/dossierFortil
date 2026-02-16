import { FileText, Calendar, Trash2 } from 'lucide-react';
import type { ProfileWithDetails } from '../lib/api';

type Props = {
    profile: ProfileWithDetails;
    onDeleteClick?: (profile: ProfileWithDetails) => void;
};

export function DossierCard({ profile, onDeleteClick }: Props) {
    const roles = profile.roles || [];

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-shadow relative group">
            <div className="flex justify-between items-start">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 flex-shrink-0">
                        <FileText className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">{profile.full_name}</h3>
                        <p className="text-gray-500">{profile.job_title || 'Sans titre'}</p>

                        <div className="flex flex-wrap gap-2 mt-3">
                            {roles.slice(0, 3).map((role, i) => (
                                <span key={i} className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-md font-medium">
                                    {role}
                                </span>
                            ))}
                            {roles.length > 3 && (
                                <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-md font-medium">+{roles.length - 3}</span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(profile.updated_at).toLocaleDateString()}
                    </span>

                    {onDeleteClick && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onDeleteClick(profile); }}
                            className="text-gray-300 hover:text-red-500 p-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all"
                            title="Supprimer le dossier"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
