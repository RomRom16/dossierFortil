import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Loader, Mail, Lock } from 'lucide-react';

export function Login() {
  const { signInWithMicrosoft, signInWithEmail, signUpWithEmail, loading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleMicrosoftSignIn = async () => {
    try {
      setError(null);
      await signInWithMicrosoft();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la connexion');
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (isSignUp) {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'authentification');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(30deg, #FF6D00 12%, transparent 12.5%, transparent 87%, #FF6D00 87.5%, #FF6D00), linear-gradient(150deg, #FF6D00 12%, transparent 12.5%, transparent 87%, #FF6D00 87.5%, #FF6D00), linear-gradient(30deg, #FF6D00 12%, transparent 12.5%, transparent 87%, #FF6D00 87.5%, #FF6D00), linear-gradient(150deg, #FF6D00 12%, transparent 12.5%, transparent 87%, #FF6D00 87.5%, #FF6D00)',
          backgroundSize: '80px 140px',
          backgroundPosition: '0 0, 0 0, 40px 70px, 40px 70px, 0 0, 40px 70px'
        }}></div>
      </div>

      <div className="bg-white rounded-xl shadow-2xl overflow-hidden max-w-4xl w-full relative z-10">
        <div className="grid md:grid-cols-2">
          <div className="bg-gradient-to-br from-orange-500 via-green-500 to-cyan-500 p-12 text-white flex flex-col justify-between">
            <div>
              <div className="mb-8">
                <img src="/fortil-logo.svg" alt="Fortil" className="h-12 mb-4 brightness-0 invert" />
              </div>
              <h1 className="text-4xl font-bold mb-4">Gestion des Profils</h1>
              <p className="text-white/90 text-lg">
                Plateforme de gestion des dossiers de compétences professionnels
              </p>
            </div>
            <div className="space-y-4 text-sm text-white/80">
              <div className="flex items-center gap-2">
                <div className="w-8 h-1 bg-white/50"></div>
                <span>Sécurisé et professionnel</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-1 bg-white/50"></div>
                <span>Interface moderne</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-1 bg-white/50"></div>
                <span>Données centralisées</span>
              </div>
            </div>
          </div>

          <div className="p-12">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {isSignUp ? 'Créer un compte' : 'Connexion'}
              </h2>
              <p className="text-gray-600">
                {isSignUp ? 'Inscrivez-vous pour commencer' : 'Accédez à votre espace'}
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleEmailAuth} className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="votre@email.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || loading}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-gray-400 disabled:to-gray-400 text-white font-medium py-3 rounded-lg transition-all shadow-lg hover:shadow-xl"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader className="w-5 h-5 animate-spin" />
                    Chargement...
                  </span>
                ) : (
                  isSignUp ? 'Créer le compte' : 'Se connecter'
                )}
              </button>
            </form>

            <div className="text-center mb-6">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError(null);
                }}
                className="text-orange-600 hover:text-orange-700 text-sm font-medium"
              >
                {isSignUp ? 'Déjà un compte? Connectez-vous' : 'Pas de compte? Inscrivez-vous'}
              </button>
            </div>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">ou</span>
              </div>
            </div>

            <button
              onClick={handleMicrosoftSignIn}
              disabled={loading || isSubmitting}
              className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 disabled:bg-gray-100 text-gray-700 font-medium py-3 rounded-lg transition-all"
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Connexion en cours...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zm12.6 0H12.6V0H24v11.4z" />
                  </svg>
                  Continuer avec Microsoft
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
