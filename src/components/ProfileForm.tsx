import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiCreateProfile, apiParseCv, apiParseCvGemini } from '../lib/api';
import { Upload, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { pdfjs } from 'react-pdf';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Worker PDF.js via Vite (?url) = même origine, pas de CORS ni unpkg
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;


type Props = {
  candidateId: string;
  candidateName: string;
  onSuccess: () => void;
  onCancel: () => void;
};

export default function ProfileForm({ candidateId, candidateName, onSuccess, onCancel }: Props) {
  const { user } = useAuth();

  const [analyzing, setAnalyzing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);

  const [dossierTitle, setDossierTitle] = useState(`${candidateName} - Dossier de compétences`);

  // JSON states
  const [roles, setRoles] = useState<string>('');
  const [description, setDescription] = useState('');
  const [expertises, setExpertises] = useState('');
  const [tools, setTools] = useState('');

  const [experiences, setExperiences] = useState<any[]>([]);
  const [educations, setEducations] = useState<any[]>([]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAnalyzing(true);
    setError(null);
    setFallbackNotice(null);

    try {
      let parsed: any;

      // Essayer d'utiliser le moteur Gemini (CV2DOC) plus puissant si c'est un PDF
      if (file.type === 'application/pdf' && user) {
        try {
          parsed = await apiParseCvGemini(user, file);
        } catch (geminiErr) {
          console.warn("Échec du parsing Gemini, passage au parsing texte classique", geminiErr);
          const msg = geminiErr instanceof Error ? geminiErr.message : "";
          const isQuota = msg.includes("Quota") || msg.includes("quota") || msg.includes("épuisé");
          setFallbackNotice(
            isQuota
              ? "Quota API Gemini épuisé. Le formulaire a été pré-rempli à partir du texte du PDF."
              : "Extraction par IA (Gemini) indisponible ; le formulaire a été pré-rempli à partir du texte du PDF."
          );
        }
      }

      // Fallback ou si ce n'est pas un PDF
      if (!parsed) {
        let text = '';
        if (file.type === 'application/pdf') {
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjs.getDocument(arrayBuffer).promise;
          let fullText = '';
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const strings = content.items.map((item: any) => item.str);
            fullText += strings.join(' ') + '\n';
          }
          text = fullText;
        } else {
          text = await file.text();
        }
        parsed = await apiParseCv(text);
      }

      if (parsed.full_name) setDossierTitle(`${parsed.full_name} - Dossier de compétences`);
      if (parsed.roles) setRoles(Array.isArray(parsed.roles) ? parsed.roles.join(', ') : parsed.roles);
      if (parsed.candidate_description) setDescription(parsed.candidate_description);
      if (parsed.general_expertises) setExpertises(Array.isArray(parsed.general_expertises) ? parsed.general_expertises.join(', ') : '');
      if (parsed.tools) setTools(Array.isArray(parsed.tools) ? parsed.tools.join(', ') : '');
      if (parsed.experiences) setExperiences(parsed.experiences);
      if (parsed.educations) setEducations(parsed.educations);

    } catch (err) {
      console.error(err);
      setError("Erreur lors de l'analyse du CV.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        candidate_id: candidateId,
        full_name: dossierTitle,
        roles: roles.split(',').map(s => s.trim()).filter(Boolean),
        candidate_description: description,
        general_expertises: expertises.split(',').map(s => s.trim()).filter(Boolean),
        tools: tools.split(',').map(s => s.trim()).filter(Boolean),
        experiences,
        educations
      };

      await apiCreateProfile(user, payload);
      setSuccess(true);
      setTimeout(onSuccess, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur sauvegarde');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900">Dossier créé avec succès !</h2>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden">
      <div className="bg-slate-50 border-b border-slate-100 p-6 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Nouveau Dossier pour {candidateName}</h2>
          <p className="text-sm text-gray-500">Importez un CV ou remplissez manuellement</p>
        </div>
        <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      <div className="p-8">
        <div className="mb-8 p-6 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-4">
          <div className="bg-white p-3 rounded-full shadow-sm">
            <Upload className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900">Importer depuis un CV (PDF)</h3>
            <p className="text-sm text-blue-700">Les champs seront pré-remplis automatiquement par l'IA.</p>
          </div>
          <label className="btn-primary cursor-pointer relative overflow-hidden">
            <input type="file" accept=".pdf,.txt" className="hidden" onChange={handleFileUpload} />
            {analyzing ? 'Analyse...' : 'Choisir un fichier'}
          </label>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titre du dossier</label>
            <input
              type="text"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              value={dossierTitle}
              onChange={e => setDossierTitle(e.target.value)}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rôles cibles (séparés par des virgules)</label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                value={roles}
                onChange={e => setRoles(e.target.value)}
                placeholder="Ex: Développeur Fullstack, Tech Lead"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Résumé / Description</label>
              <textarea
                rows={1}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expertises (séparées par des virgules)</label>
            <input
              type="text"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              value={expertises}
              onChange={e => setExpertises(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Outils (séparés par des virgules)</label>
            <input
              type="text"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              value={tools}
              onChange={e => setTools(e.target.value)}
            />
          </div>

          {fallbackNotice && (
            <div className="p-4 bg-amber-50 text-amber-800 rounded-lg flex items-center gap-2 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              {fallbackNotice}
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
            <button type="button" onClick={onCancel} className="px-6 py-2 text-gray-600 hover:bg-gray-50 rounded-lg">
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary"
            >
              {submitting ? 'Création...' : 'Créer le dossier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
