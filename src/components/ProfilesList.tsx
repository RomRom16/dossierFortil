import { useState, useEffect } from 'react';
import { Briefcase, Calendar, Award, Wrench, MapPin, Building } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { apiListProfiles, type ProfileWithDetails } from '../lib/api';

type Props = {
  onBack: () => void;
};

export default function ProfilesList({ onBack }: Props) {
  const { user, isBusinessManager, isAdmin } = useAuth();
  const [profiles, setProfiles] = useState<ProfileWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      if (!user) {
        setProfiles([]);
        setError('Utilisateur non connecté');
        return;
      }

      const data = await apiListProfiles(user);
      setProfiles(data);
    } catch (err) {
      console.error('Error fetching profiles:', err);
      const message =
        err instanceof Error ? err.message : 'Erreur lors du chargement des profils';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-xl text-gray-600">Chargement...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-xl text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex items-center gap-4">
          <div className="h-1 flex-1 bg-gradient-to-r from-orange-500 via-green-500 to-cyan-500"></div>
          <h1 className="text-3xl font-bold text-gray-900">
            {isAdmin
              ? `Tous les profils (${profiles.length})`
              : isBusinessManager
                ? `Mes candidats (${profiles.length})`
                : `Mes dossiers de compétences (${profiles.length})`}
          </h1>
          <div className="h-1 flex-1 bg-gradient-to-l from-orange-500 via-green-500 to-cyan-500"></div>
        </div>

        {profiles.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl shadow-lg">
            <p className="text-gray-500 text-lg">
              {isAdmin || isBusinessManager
                ? 'Aucun candidat enregistré pour le moment.'
                : 'Aucun dossier de compétences n’a encore été créé sur votre compte.'}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {profiles.map(profile => (
              <div
                key={profile.id}
                className="bg-white rounded-xl shadow-xl overflow-hidden border-t-4 border-orange-500"
              >
                {/* Header */}
                <div className="relative p-8 bg-gradient-to-br from-slate-50 to-white">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-green-500 to-cyan-500"></div>
                  
                  <h2 className="text-3xl font-bold text-gray-900 mb-3">
                    {profile.full_name || 'Profil'}
                  </h2>
                  
                  {profile.roles && profile.roles.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xl text-orange-600 font-semibold">
                        {profile.roles.join(' / ')}
                      </p>
                    </div>
                  )}
                  
                  {profile.candidate_description && (
                    <p className="text-gray-700 leading-relaxed max-w-4xl">
                      {profile.candidate_description}
                    </p>
                  )}
                  
                  <p className="text-sm text-gray-400 mt-4">
                    Créé le {new Date(profile.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>

                <div className="p-8 space-y-8">
                  {/* Expertises */}
                  {profile.general_expertises.length > 0 && (
                    <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg p-6">
                      <h3 className="text-2xl font-bold mb-4">Expertises</h3>
                      <ul className="space-y-2">
                        {profile.general_expertises.map(exp => (
                          <li key={exp.id} className="flex items-start gap-2">
                            <span className="text-white/80 mt-1.5">•</span>
                            <span>{exp.expertise}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Outils */}
                  {profile.tools.length > 0 && (
                    <div className="bg-gradient-to-r from-green-50 to-cyan-50 rounded-lg p-6 border-l-4 border-green-500">
                      <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Wrench className="w-6 h-6 text-green-600" />
                        Outils
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {profile.tools.map(tool => (
                          <span
                            key={tool.id}
                            className="px-4 py-2 bg-white text-gray-800 rounded-lg text-sm font-medium shadow-sm border border-gray-200"
                          >
                            {tool.tool_name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Expériences */}
                  {profile.experiences.length > 0 && (
                    <div>
                      <div className="flex items-center gap-3 mb-6">
                        <Briefcase className="w-6 h-6 text-orange-500" />
                        <h3 className="text-2xl font-bold text-gray-900 border-b-2 border-orange-500 pb-2 inline-block">
                          Expériences
                        </h3>
                      </div>
                      <div className="space-y-6">
                        {profile.experiences.map(exp => (
                          <div
                            key={exp.id}
                            className="bg-slate-50 rounded-lg p-6 border-l-4 border-orange-500"
                          >
                            <div className="flex flex-wrap justify-between items-start mb-3 gap-2">
                              <div>
                                <h4 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                  <Building className="w-5 h-5 text-orange-500" />
                                  {exp.company}
                                </h4>
                                {exp.location && (
                                  <p className="text-gray-600 flex items-center gap-1 mt-1">
                                    <MapPin className="w-4 h-4" />
                                    {exp.location}
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                  <Calendar className="w-4 h-4" />
                                  {formatDate(exp.start_date)} - {exp.end_date ? formatDate(exp.end_date) : 'Présent'}
                                </p>
                                {exp.sector && (
                                  <p className="text-sm text-gray-500 mt-1">{exp.sector}</p>
                                )}
                              </div>
                            </div>

                            {exp.job_title && (
                              <p className="text-orange-600 font-semibold mb-3">{exp.job_title}</p>
                            )}

                            {exp.project && (
                              <div className="mb-3">
                                <span className="text-sm font-medium text-gray-700">Projet: </span>
                                <span className="text-gray-900">{exp.project}</span>
                              </div>
                            )}

                            {exp.responsibilities && (
                              <div className="mb-3">
                                <h5 className="text-sm font-semibold text-orange-600 mb-2">Responsabilités</h5>
                                <p className="text-gray-700 leading-relaxed whitespace-pre-line">{exp.responsibilities}</p>
                              </div>
                            )}

                            {exp.technical_environment && (
                              <div className="mt-4 pt-4 border-t border-gray-200">
                                <h5 className="text-sm font-semibold text-orange-600 mb-2">Environnement technique</h5>
                                <p className="text-gray-700">{exp.technical_environment}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Diplômes */}
                  {profile.educations.length > 0 && (
                    <div>
                      <div className="flex items-center gap-3 mb-6">
                        <Award className="w-6 h-6 text-orange-500" />
                        <h3 className="text-2xl font-bold text-gray-900 border-b-2 border-orange-500 pb-2 inline-block">
                          Diplômes
                        </h3>
                      </div>
                      <div className="space-y-3">
                        {profile.educations.map(edu => (
                          <div
                            key={edu.id}
                            className="flex justify-between items-center p-4 bg-gradient-to-r from-green-50 to-cyan-50 rounded-lg border-l-4 border-green-500"
                          >
                            <div>
                              <p className="font-semibold text-gray-900 text-lg">
                                {edu.degree_or_certification}
                              </p>
                              {edu.institution && (
                                <p className="text-gray-600 mt-1">{edu.institution}</p>
                              )}
                            </div>
                            {edu.year && (
                              <span className="text-orange-600 font-bold text-xl">{edu.year}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
