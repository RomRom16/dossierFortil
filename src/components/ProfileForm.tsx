import { useState } from 'react';
import {
  Plus,
  Trash2,
  Save,
  User,
  Briefcase,
  GraduationCap,
  Wrench,
  FileText,
  Calendar,
} from 'lucide-react';
import { CVData, CVImport } from './CVImport';
import { useAuth } from '../contexts/AuthContext';
import { apiCreateProfile, type ProfilePayload } from '../lib/api';

type ExperienceForm = {
  company: string;
  location: string;
  start_date: string;
  end_date: string;
  job_title: string;
  sector: string;
  project: string;
  responsibilities: string;
  technical_environment: string;
};

type EducationForm = {
  degree_or_certification: string;
  year: string;
  institution: string;
};

type FormData = {
  full_name: string;
  roles: string[];
  candidate_description: string;
  general_expertises: string[];
  tools: string[];
  experiences: ExperienceForm[];
  educations: EducationForm[];
};

const initialExperience: ExperienceForm = {
  company: '',
  location: '',
  start_date: '',
  end_date: '',
  job_title: '',
  sector: '',
  project: '',
  responsibilities: '',
  technical_environment: '',
};

const initialEducation: EducationForm = {
  degree_or_certification: '',
  year: '',
  institution: '',
};

type Props = {
  onViewProfiles: () => void;
};

export default function ProfileForm({ onViewProfiles }: Props) {
  const { user } = useAuth();
  const [formData, setFormData] = useState<FormData>({
    full_name: '',
    roles: [''],
    candidate_description: '',
    general_expertises: [''],
    tools: [''],
    experiences: [{ ...initialExperience }],
    educations: [{ ...initialEducation }],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showCVImport, setShowCVImport] = useState(false);

  const handleAddItem = (field: 'roles' | 'general_expertises' | 'tools') => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], ''],
    }));
  };

  const handleRemoveItem = (field: 'roles' | 'general_expertises' | 'tools', index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  const handleItemChange = (field: 'roles' | 'general_expertises' | 'tools', index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => (i === index ? value : item)),
    }));
  };

  const handleAddExperience = () => {
    setFormData(prev => ({
      ...prev,
      experiences: [...prev.experiences, { ...initialExperience }],
    }));
  };

  const handleRemoveExperience = (index: number) => {
    setFormData(prev => ({
      ...prev,
      experiences: prev.experiences.filter((_, i) => i !== index),
    }));
  };

  const handleExperienceChange = (index: number, field: keyof ExperienceForm, value: string) => {
    setFormData(prev => ({
      ...prev,
      experiences: prev.experiences.map((exp, i) =>
        i === index ? { ...exp, [field]: value } : exp
      ),
    }));
  };

  const handleAddEducation = () => {
    setFormData(prev => ({
      ...prev,
      educations: [...prev.educations, { ...initialEducation }],
    }));
  };

  const handleRemoveEducation = (index: number) => {
    setFormData(prev => ({
      ...prev,
      educations: prev.educations.filter((_, i) => i !== index),
    }));
  };

  const handleEducationChange = (index: number, field: keyof EducationForm, value: string) => {
    setFormData(prev => ({
      ...prev,
      educations: prev.educations.map((edu, i) =>
        i === index ? { ...edu, [field]: value } : edu
      ),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setMessage({ type: 'error', text: 'Utilisateur non connecté. Impossible de créer le profil.' });
      return;
    }
    setIsSubmitting(true);
    setMessage(null);

    try {
      const payload: ProfilePayload = {
        full_name: formData.full_name.trim(),
        roles: formData.roles.map(r => r.trim()).filter(Boolean),
        candidate_description: formData.candidate_description,
        general_expertises: formData.general_expertises.map(e => e.trim()).filter(Boolean),
        tools: formData.tools.map(t => t.trim()).filter(Boolean),
        experiences: formData.experiences
          .filter(exp => exp.company.trim())
          .map(exp => ({
            company: exp.company.trim(),
            location: exp.location.trim(),
            start_date: exp.start_date,
            end_date: exp.end_date || null,
            job_title: exp.job_title.trim(),
            sector: exp.sector.trim(),
            project: exp.project.trim(),
            responsibilities: exp.responsibilities.trim(),
            technical_environment: exp.technical_environment.trim(),
            expertises: [],
            tools_used: [],
          })),
        educations: formData.educations
          .filter(edu => edu.degree_or_certification.trim())
          .map(edu => ({
            degree_or_certification: edu.degree_or_certification.trim(),
            institution: edu.institution.trim(),
            year: edu.year || null,
          })),
      };

      await apiCreateProfile(user, payload);

      setMessage({ type: 'success', text: 'Profil créé avec succès!' });
      setFormData({
        full_name: '',
        roles: [''],
        candidate_description: '',
        general_expertises: [''],
        tools: [''],
        experiences: [{ ...initialExperience }],
        educations: [{ ...initialEducation }],
      });

      setTimeout(() => {
        onViewProfiles();
      }, 1500);
    } catch (error) {
      console.error('Error submitting form:', error);
      setMessage({ type: 'error', text: 'Erreur lors de la création du profil' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCVImported = (data: CVData): void => {
    // Pré-remplit le formulaire sans enregistrer en base
    const roles = data.roles.map(r => r.trim()).filter(Boolean);
    const generalExpertises = data.general_expertises.map(e => e.trim()).filter(Boolean);
    const tools = data.tools.map(t => t.trim()).filter(Boolean);

    const experiences: ExperienceForm[] =
      data.experiences.length > 0
        ? data.experiences.map(exp => ({
            company: exp.company.trim(),
            location: exp.location.trim(),
            start_date: exp.start_date || '',
            end_date: exp.end_date || '',
            job_title: exp.job_title.trim(),
            sector: exp.sector.trim(),
            project: exp.project.trim(),
            responsibilities: exp.responsibilities.trim(),
            technical_environment: exp.technical_environment.trim(),
          }))
        : [{ ...initialExperience }];

    const educations: EducationForm[] =
      data.educations.length > 0
        ? data.educations.map(edu => ({
            degree_or_certification: edu.degree_or_certification.trim(),
            year: edu.year || '',
            institution: edu.institution.trim(),
          }))
        : [{ ...initialEducation }];

    setFormData({
      full_name: data.full_name.trim(),
      roles: roles.length > 0 ? roles : [''],
      candidate_description: data.candidate_description,
      general_expertises: generalExpertises.length > 0 ? generalExpertises : [''],
      tools: tools.length > 0 ? tools : [''],
      experiences,
      educations,
    });

    setShowCVImport(false);
    setMessage({
      type: 'success',
      text: 'CV importé. Vérifiez et complétez les informations avant d’enregistrer le profil.',
    });
  };

  return (
    <div className="py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-xl shadow-xl overflow-hidden border-t-4 border-orange-500">
          <div className="p-8">
            <div className="flex items-center gap-4 mb-8">
              <div className="h-1 flex-1 bg-gradient-to-r from-orange-500 via-green-500 to-cyan-500"></div>
              <h1 className="text-3xl font-bold text-gray-900">Nouveau Profil Professionnel</h1>
              <div className="h-1 flex-1 bg-gradient-to-l from-orange-500 via-green-500 to-cyan-500"></div>
            </div>

            {showCVImport && (
              <div className="mb-6">
                <CVImport onCVImported={handleCVImported} />
                <button
                  type="button"
                  onClick={() => setShowCVImport(false)}
                  className="mt-4 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Annuler
                </button>
              </div>
            )}

            {!showCVImport && (
              <button
                type="button"
                onClick={() => setShowCVImport(true)}
                className="flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors mb-6"
              >
                <FileText className="w-5 h-5" />
                Importer un CV (PDF)
              </button>
            )}

            {message && (
              <div
                className={`mb-6 p-4 rounded-lg border $\{
                  message.type === 'success'
                    ? 'bg-green-50 text-green-800 border-green-200'
                    : 'bg-red-50 text-red-800 border-red-200'
                }`}
              >
                {message.text}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Informations personnelles */}
              <section className="space-y-4">
                <div className="flex items-center gap-3 mb-6">
                  <User className="w-6 h-6 text-orange-500" />
                  <h2 className="text-2xl font-semibold text-gray-900 border-b-2 border-orange-500 pb-2 inline-block">
                    Informations personnelles
                  </h2>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom complet *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={e =>
                      setFormData(prev => ({ ...prev, full_name: e.target.value }))
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                    placeholder="Ex: Roméo Probst"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rôles
                  </label>
                  {formData.roles.map((role, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={role}
                        onChange={e => handleItemChange('roles', index, e.target.value)}
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                        placeholder="Ex: AMOA / Chef de projet / Business Analyst"
                      />
                      {formData.roles.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem('roles', index)}
                          className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleAddItem('roles')}
                    className="flex items-center gap-2 px-4 py-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors border border-orange-200"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter un rôle
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description du profil
                  </label>
                  <textarea
                    value={formData.candidate_description}
                    onChange={e =>
                      setFormData(prev => ({ ...prev, candidate_description: e.target.value }))
                    }
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                    placeholder="Décrivez votre profil professionnel et vos aspirations..."
                  />
                </div>
              </section>

              {/* Expertises */}
              <section className="space-y-4">
                <div className="flex items-center gap-3 mb-6">
                  <FileText className="w-6 h-6 text-orange-500" />
                  <h2 className="text-2xl font-semibold text-gray-900 border-b-2 border-orange-500 pb-2 inline-block">
                    Expertises
                  </h2>
                </div>
                {formData.general_expertises.map((expertise, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={expertise}
                      onChange={e => handleItemChange('general_expertises', index, e.target.value)}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                      placeholder="Ex: Analyse et formalisation des besoins métiers"
                    />
                    {formData.general_expertises.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem('general_expertises', index)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={20} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => handleAddItem('general_expertises')}
                  className="flex items-center gap-2 px-4 py-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors border border-orange-200"
                >
                  <Plus size={20} />
                  Ajouter une expertise
                </button>
              </section>

              {/* Outils */}
              <section className="space-y-4">
                <div className="flex items-center gap-3 mb-6">
                  <Wrench className="w-6 h-6 text-orange-500" />
                  <h2 className="text-2xl font-semibold text-gray-900 border-b-2 border-orange-500 pb-2 inline-block">
                    Outils et technologies
                  </h2>
                </div>
                {formData.tools.map((tool, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={tool}
                      onChange={e => handleItemChange('tools', index, e.target.value)}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                      placeholder="Ex: JavaScript, React, Node.js"
                    />
                    {formData.tools.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem('tools', index)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={20} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => handleAddItem('tools')}
                  className="flex items-center gap-2 px-4 py-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors border border-orange-200"
                >
                  <Plus size={20} />
                  Ajouter un outil
                </button>
              </section>

              {/* Expériences */}
              <section className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <Briefcase className="w-6 h-6 text-orange-500" />
                  <h2 className="text-2xl font-semibold text-gray-900 border-b-2 border-orange-500 pb-2 inline-block">
                    Expériences professionnelles
                  </h2>
                </div>
                {formData.experiences.map((experience, expIndex) => (
                  <div key={expIndex} className="p-6 bg-gradient-to-br from-orange-50 to-green-50 rounded-lg space-y-4 relative border-l-4 border-orange-500">
                    {formData.experiences.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveExperience(expIndex)}
                        className="absolute top-4 right-4 px-3 py-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                      >
                        <Trash2 size={20} />
                      </button>
                    )}

                    <h3 className="font-semibold text-lg text-orange-800 flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Expérience {expIndex + 1}
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Entreprise *
                        </label>
                        <input
                          type="text"
                          value={experience.company}
                          onChange={e =>
                            handleExperienceChange(expIndex, 'company', e.target.value)
                          }
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                          placeholder="Ex: Eurométropole de Strasbourg"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Localisation
                        </label>
                        <input
                          type="text"
                          value={experience.location}
                          onChange={e =>
                            handleExperienceChange(expIndex, 'location', e.target.value)
                          }
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                          placeholder="Ex: Strasbourg"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Poste occupé
                        </label>
                        <input
                          type="text"
                          value={experience.job_title}
                          onChange={e =>
                            handleExperienceChange(expIndex, 'job_title', e.target.value)
                          }
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                          placeholder="Ex: Chef de projet SI / Développeur"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Secteur
                        </label>
                        <input
                          type="text"
                          value={experience.sector}
                          onChange={e =>
                            handleExperienceChange(expIndex, 'sector', e.target.value)
                          }
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                          placeholder="Ex: Administration publique"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Date de début *
                        </label>
                        <input
                          type="date"
                          value={experience.start_date}
                          onChange={e =>
                            handleExperienceChange(expIndex, 'start_date', e.target.value)
                          }
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Date de fin
                        </label>
                        <input
                          type="date"
                          value={experience.end_date}
                          onChange={e =>
                            handleExperienceChange(expIndex, 'end_date', e.target.value)
                          }
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Projet
                      </label>
                      <input
                        type="text"
                        value={experience.project}
                        onChange={e =>
                          handleExperienceChange(expIndex, 'project', e.target.value)
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                        placeholder="Nom du projet"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Responsabilités
                      </label>
                      <textarea
                        value={experience.responsibilities}
                        onChange={e =>
                          handleExperienceChange(expIndex, 'responsibilities', e.target.value)
                        }
                        rows={4}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                        placeholder="Décrivez vos responsabilités dans ce poste..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Environnement technique
                      </label>
                      <textarea
                        value={experience.technical_environment}
                        onChange={e =>
                          handleExperienceChange(expIndex, 'technical_environment', e.target.value)
                        }
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                        placeholder="Ex: Java, Spring Boot, PostgreSQL, Docker, Kubernetes..."
                      />
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleAddExperience}
                  className="flex items-center gap-2 px-4 py-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors border border-orange-200"
                >
                  <Plus size={20} />
                  Ajouter une expérience
                </button>
              </section>

              {/* Diplômes */}
              <section className="space-y-4">
                <div className="flex items-center gap-3 mb-6">
                  <GraduationCap className="w-6 h-6 text-orange-500" />
                  <h2 className="text-2xl font-semibold text-gray-900 border-b-2 border-orange-500 pb-2 inline-block">
                    Diplômes et certifications
                  </h2>
                </div>
                {formData.educations.map((education, index) => (
                  <div key={index} className="p-4 bg-gradient-to-r from-green-50 to-cyan-50 rounded-lg space-y-4 relative border-l-4 border-green-500">
                    {formData.educations.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveEducation(index)}
                        className="absolute top-4 right-4 px-3 py-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                      >
                        <Trash2 size={20} />
                      </button>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Diplôme
                        </label>
                        <input
                          type="text"
                          value={education.degree_or_certification}
                          onChange={e =>
                            handleEducationChange(index, 'degree_or_certification', e.target.value)
                          }
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                          placeholder="Ex: Master en Informatique"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Année
                        </label>
                        <input
                          type="number"
                          value={education.year}
                          onChange={e => handleEducationChange(index, 'year', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                          placeholder="2020"
                          min="1950"
                          max="2100"
                        />
                      </div>

                      <div className="md:col-span-3">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Institution
                        </label>
                        <input
                          type="text"
                          value={education.institution}
                          onChange={e =>
                            handleEducationChange(index, 'institution', e.target.value)
                          }
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                          placeholder="Nom de l'établissement"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleAddEducation}
                  className="flex items-center gap-2 px-4 py-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors border border-orange-200"
                >
                  <Plus size={20} />
                  Ajouter un diplôme/certification
                </button>
              </section>

              <div className="flex justify-end pt-6 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all font-semibold shadow-lg hover:shadow-xl"
                >
                  <Save size={20} />
                  {isSubmitting ? 'Enregistrement...' : 'Enregistrer le profil'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

