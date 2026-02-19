# 📄 Plateforme FORTIL - Dossiers de Compétences

Cette plateforme permet de gérer les candidatures et de générer des **Dossiers de Compétences** professionnels à partir de CV au format PDF. Elle utilise l'intelligence artificielle pour extraire les informations clés et automatiser la création de documents DOCX.

## 🚀 Fonctionnalités Clés

- **Extraction IA** : Analyse automatique des CV (PDF) pour extraire expériences, formations, compétences et outils.
- **Gestion des Candidats** : Suivi complet des candidats par les Business Managers.
- **Génération de Dossiers** : Création de dossiers de compétences structurés et exportables.
- **Authentification Microsoft** : Connexion sécurisée via Azure AD et Supabase.
- **Validation Multi-Rôles** : Accès différenciés pour les Administrateurs, Business Managers et Consultants.

## 🏗️ Architecture Technique

Le projet est divisé en trois composants principaux :

1.  **Frontend (React)** : Une application moderne sous Vite, React et Tailwind CSS.
2.  **Backend (Node.js)** : API Express gérant la base de données SQLite (`better-sqlite3`) et l'orchestration des données.
3.  **Pipeline CV2DOC (n8n & FastAPI)** : Module optionnel pour la génération avancée de documents via des workflows n8n et l'IA Gemini.

## 🛠️ Installation et Démarrage

### Pré-requis
- [Docker & Docker Compose](https://www.docker.com/)
- Un compte [OpenAI](https://openai.com/) (pour l'extraction de données)
- Un compte [Supabase](https://supabase.com/) & Azure AD (pour l'authentification)

### Configuration
1. Clonez le dépôt.
2. Créez un fichier `.env` à la racine en vous basant sur `.env.example`.
3. Configurez les variables d'environnement suivantes :
   # API Keys
   OPENAI_API_KEY=votre_cle_openai
   AI_API_KEY=votre_cle_gemini_pour_cv2doc
   PORT=4000

   # Frontend
   VITE_SUPABASE_URL=votre_url_supabase
   VITE_SUPABASE_ANON_KEY=votre_cle_anonyme
   ```

### Lancement en local (sans Docker)

Pour tout faire tourner en local (frontend, backend, FastAPI pour l’IA) :

1. **Fichier `.env`** à la racine (voir Configuration ci‑dessus). En local, **ne pas** définir `N8N_WEBHOOK_URL_DOCX` (ou le laisser vide) pour que le backend appelle FastAPI directement.

2. **Terminal 1 – Backend**  
   Depuis la racine (charge le `.env` à la racine, Node 20+) :
   ```bash
   cd backend && npm install && cd ..
   npm run dev:backend
   ```
   → API sur **http://localhost:4000**

3. **Terminal 2 – FastAPI (CV2DOC / Gemini)**  
   Depuis le dossier du projet :
   ```bash
   cd CV2DOC-n8n-flow-main/endpoint && uv run fastapi run main.py --port 8000 --host 0.0.0.0
   ```
   (Prérequis : [uv](https://docs.astral.sh/uv/). Si besoin : `curl -LsSf https://astral.sh/uv/install.sh | sh`.)  
   → Service sur **http://localhost:8000** (extraction JSON + génération DOCX).

4. **Terminal 3 – Frontend**
   ```bash
   npm install && npm run dev
   ```
   → App sur **http://localhost:5173** (le proxy envoie `/api` vers le backend).

Ouvrir **http://localhost:5173** dans le navigateur. L’extraction par Gemini et la génération DOCX depuis un CV fonctionnent si le backend et FastAPI tournent.

---

### Lancement avec Docker
Le moyen le plus simple de lancer l'application complète est d'utiliser Docker Compose. Cela démarrera le frontend, le backend, le service d'analyse de CV (FastAPI) et n8n.

```bash
docker compose up --build -d
```

Lance **tous** les services (frontend, backend, n8n, FastAPI). La génération « Générer depuis CV » a besoin de **n8n** et de **FastAPI** (fortil-fastapi) ; si l’un des deux est arrêté, vous obtiendrez une erreur du type « service indisponible ».

- **Frontend** : `http://localhost:8080` (Interface utilisateur principale)
- **Backend API** : `http://localhost:4000`
- **n8n** : `http://localhost:5678` (Workflow automation)

### Utilisation de CV2DOC
Pour générer un dossier de compétences directement depuis un CV :
1. Connectez-vous à la plateforme.

**En Docker**, la génération DOCX passe par n8n par défaut (`http://fortil-n8n:5678/webhook/cv2doc-docx`). Importez et activez le workflow [CV2DOC-webhook-docx](CV2DOC-n8n-flow-main/n8n_workflows/) dans n8n. Pour désactiver : `N8N_WEBHOOK_URL_DOCX=` dans le `.env`.  
**En local (sans Docker), optionnel :** définissez `N8N_WEBHOOK_URL_DOCX` (ex. `http://localhost:5678/webhook/cv2doc-docx`) dans le `.env` et importez/activez le workflow [CV2DOC-webhook-docx](CV2DOC-n8n-flow-main/n8n_workflows/) dans n8n. Chaque clic sur « Générer depuis CV » déclenchera alors le workflow n8n. Voir [CV2DOC-n8n-flow-main/README.md](CV2DOC-n8n-flow-main/README.md).

2. Allez sur la fiche d'un **Candidat**.
3. Cliquez sur le bouton **"Générer depuis CV"**.
4. Sélectionnez un fichier **PDF**.
5. Le système extraira les données et vous proposera de télécharger le fichier **.docx** généré.

## 📂 Structure du Projet

```text
├── backend/               # Serveur API Node.js & SQLite
├── src/                   # Source Frontend (React + Vite)
├── public/                # Assets statiques
├── CV2DOC-n8n-flow-main/  # Module de traitement CV (n8n/Python)
├── docker-compose.yml     # Orchestration globale
└── profiles.db            # Base de données locale (SQLite)
```

## 🔒 Authentification
L'authentification est gérée par **Supabase** avec le fournisseur **Azure AD** (Microsoft). 
Pour plus de détails sur la configuration, consultez le fichier `AUTHENTIFICATION_MICROSOFT.md`.

## 📄 Licence
Propriété de FORTIL.
