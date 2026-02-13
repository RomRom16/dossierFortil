import { useState } from 'react';
import { Upload, Loader } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// Configurer le worker PDF.js
if (typeof window !== 'undefined' && 'Worker' in window) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();
}

export type CVData = {
  full_name: string;
  roles: string[];
  candidate_description: string;
  general_expertises: string[];
  tools: string[];
  experiences: Array<{
    company: string;
    location: string;
    start_date: string;
    end_date: string;
    job_title: string;
    sector: string;
    project: string;
    responsibilities: string;
    technical_environment: string;
  }>;
  educations: Array<{
    degree_or_certification: string;
    year: string;
    institution: string;
  }>;
};

type Props = {
  onCVImported: (data: CVData) => void;
};

export function CVImport({ onCVImported }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

  const extractTextFromPDF = async (file: File): Promise<string> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        
        try {
          const textContent = await page.getTextContent();
          
          if (!textContent || !textContent.items) {
            console.warn(`Page ${i} has no text items`);
            continue;
          }

          const pageText = textContent.items
            .map((item: any) => {
              if (typeof item.str === 'string') {
                return item.str;
              }
              return '';
            })
            .join(' ');
          
          fullText += pageText + '\n';
        } catch (pageError) {
          console.warn(`Error extracting text from page ${i}:`, pageError);
          continue;
        }
      }

      if (!fullText || fullText.trim().length === 0) {
        throw new Error('Aucun texte trouvé dans le PDF. Le fichier peut être corrompu ou contenir uniquement des images.');
      }

      return fullText;
    } catch (error) {
      console.error('PDF extraction error:', error);
      throw new Error(`Erreur lors de la lecture du PDF: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  };

  const parseCV = (text: string): CVData => {
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      throw new Error('Le PDF ne contient pas de texte exploitable');
    }

    const fullName = extractFullNameFromLines(lines);
    const roles = extractPattern(text, /(?:poste|rôle|position|titre)[:\s]+([^\n]+)/gi);
    const expertises = extractPattern(text, /(?:compétence|expertise|domaine|spécialité)[:\s]+([^\n]+)/gi);
    const tools = extractPattern(text, /(?:technologie|outil|langage|framework|stack)[:\s]+([^\n]+)/gi);

    const experiences = extractExperiences(text);
    const educations = extractEducations(text);

    return {
      full_name: fullName,
      roles: roles.length > 0 ? roles : [''],
      candidate_description: extractDescription(text),
      general_expertises: expertises.length > 0 ? expertises : [''],
      tools: tools.length > 0 ? tools : [''],
      experiences: experiences.length > 0 ? experiences : [{
        company: '',
        location: '',
        start_date: '',
        end_date: '',
        job_title: '',
        sector: '',
        project: '',
        responsibilities: '',
        technical_environment: '',
      }],
      educations: educations.length > 0 ? educations : [{
        degree_or_certification: '',
        year: '',
        institution: '',
      }],
    };
  };

  const extractPattern = (text: string, regex: RegExp): string[] => {
    const matches = text.matchAll(regex);
    const results: string[] = [];
    for (const match of matches) {
      const item = match[1]?.trim();
      if (item && item.length > 0) results.push(item);
    }
    return [...new Set(results)];
  };

  const extractDescription = (text: string): string => {
    const match = text.match(/(?:à propos|résumé|objectif)[:\s]+([^\n]{20,200})/i);
    return match ? match[1].trim() : '';
  };

  const extractExperiences = (text: string): CVData['experiences'] => {
    const experiences: CVData['experiences'] = [];
    
    const expPattern = /([a-z\s]+)\s*\|\s*([a-z\s,]+)\s*\|\s*(\d{4}-\d{4}|\d{1,2}\/\d{1,2}\/\d{4})/gi;
    const matches = text.matchAll(expPattern);

    for (const match of matches) {
      experiences.push({
        company: match[1]?.trim() || '',
        job_title: match[2]?.trim() || '',
        location: '',
        start_date: formatDate(match[3]) || '',
        end_date: '',
        sector: '',
        project: '',
        responsibilities: '',
        technical_environment: '',
      });
    }

    return experiences;
  };

  const extractEducations = (text: string): CVData['educations'] => {
    const educations: CVData['educations'] = [];
    
    const degreePattern = /(?:diplôme|certification|licence|master|bac)[:\s]+([^\n]+)/gi;
    const matches = text.matchAll(degreePattern);

    for (const match of matches) {
      const degree = match[1]?.trim() || '';
      const yearMatch = degree.match(/(\d{4})/);
      educations.push({
        degree_or_certification: degree.replace(/\d{4}/, '').trim(),
        year: yearMatch ? yearMatch[1] : '',
        institution: '',
      });
    }

    return educations;
  };

  const extractFullNameFromLines = (lines: string[]): string => {
    const STOP_WORDS = [
      'compétences',
      'competences',
      'contact',
      'contacts',
      'formations',
      'formation',
      'curriculum',
      'cv',
      'profil',
      'profile',
      'expériences',
      'experiences',
      'parcours',
      'skills',
      'summary',
    ];

    const candidateLines = lines.slice(0, 15);

    for (const raw of candidateLines) {
      const line = raw.trim().replace(/\s+/g, ' ');
      if (!line) continue;
      if (line.length < 3 || line.length > 80) continue;
      if (line.includes('@')) continue;
      if (/[0-9]/.test(line)) continue;
      if (line.includes(':')) continue;

      const words = line.split(' ');
      if (words.length < 2 || words.length > 5) continue;

      const firstWord = words[0].toLowerCase();
      if (STOP_WORDS.includes(firstWord)) continue;

      const capitalizedRatio =
        words.filter(w => w[0] && w[0] === w[0].toUpperCase()).length / words.length;
      if (capitalizedRatio < 0.6) continue;

      return line;
    }

    return candidateLines[0]?.trim() || 'Candidat';
  };

  const formatDate = (dateStr: string): string => {
    if (!dateStr) return '';
    
    if (dateStr.match(/\d{4}-\d{4}/)) {
      return dateStr.split('-')[0];
    }
    
    const parts = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (parts) {
      return `${parts[3]}-${parts[2].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
    }
    
    return '';
  };

  const parseCvWithBackend = async (text: string): Promise<CVData> => {
    try {
      const response = await fetch(`${API_URL}/parse-cv`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const msg = await response.text();
        console.warn('Erreur backend /api/parse-cv, fallback local:', response.status, msg);
        return parseCV(text);
      }

      const data = (await response.json()) as CVData;
      return data;
    } catch (err) {
      console.warn('Erreur réseau /api/parse-cv, fallback local:', err);
      return parseCV(text);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Veuillez sélectionner un fichier PDF');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const text = await extractTextFromPDF(file);
      const cvData = await parseCvWithBackend(text);
      onCVImported(cvData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue lors de la lecture du PDF';
      setError(errorMessage);
      console.error('PDF parsing error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-dashed border-blue-300 p-8 mb-6">
      <label className="flex flex-col items-center justify-center cursor-pointer">
        <div className="flex flex-col items-center gap-3">
          {isLoading ? (
            <>
              <Loader className="w-12 h-12 text-blue-500 animate-spin" />
              <p className="text-blue-700 font-semibold">Lecture du CV en cours...</p>
            </>
          ) : (
            <>
              <Upload className="w-12 h-12 text-blue-500" />
              <div className="text-center">
                <p className="text-blue-700 font-semibold">Importer un CV (PDF)</p>
                <p className="text-blue-500 text-sm">Cliquez pour sélectionner un fichier</p>
              </div>
            </>
          )}
        </div>
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          className="hidden"
          disabled={isLoading}
        />
      </label>
      
      {error && (
        <p className="mt-4 text-red-600 text-sm text-center">{error}</p>
      )}
    </div>
  );
}