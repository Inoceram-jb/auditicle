# Projet : **Auditicle** Article-to-Audio Podcast Generator

## Vue d'ensemble

Application web permettant de transformer des articles en épisodes audio narratifs avec génération de flux RSS, destinée à un usage personnel pour l'écoute d'articles pendant les trajets en voiture.

---

## Architecture technique

### Stack technologique

**Frontend**
- Framework : React 18+ avec TypeScript
- Build tool : Vite
- Styling : Tailwind CSS
- State management : React Context API ou Zustand (léger)
- HTTP client : Fetch API native

**Backend**
- Plateforme : Vercel (Serverless Functions)
- Runtime : Node.js 18+
- API : REST endpoints via Vercel API Routes
- Language : TypeScript

**Base de données**
- Service : Supabase (PostgreSQL)
- ORM/Client : @supabase/supabase-js
- Schema : Relations articles ↔ episodes

**Stockage audio**
- Service : Cloudflare R2 (S3-compatible)
- SDK : @aws-sdk/client-s3
- Format : Fichiers MP3 publiquement accessibles

**Services externes**
- TTS principal : Google Cloud Text-to-Speech API
- TTS premium (optionnel) : ElevenLabs API
- Extraction contenu : @mozilla/readability + jsdom

---

## Schéma de base de données

### Table `articles`
- id (UUID, PK)
- url (TEXT, UNIQUE)
- title (TEXT)
- content (TEXT) - contenu extrait et nettoyé
- author (TEXT, nullable)
- created_at (TIMESTAMP)

### Table `episodes`
- id (UUID, PK)
- article_id (UUID, FK → articles.id)
- audio_url (TEXT) - URL publique Cloudflare R2
- duration (INTEGER) - durée en secondes
- file_size (INTEGER) - taille en bytes
- status (ENUM: 'pending', 'processing', 'completed', 'failed')
- tts_provider (ENUM: 'google', 'elevenlabs')
- error_message (TEXT, nullable)
- created_at (TIMESTAMP)
- completed_at (TIMESTAMP, nullable)

### Table `settings`
- id (UUID, PK)
- user_id (TEXT) - identifiant unique utilisateur
- podcast_title (TEXT)
- podcast_description (TEXT)
- podcast_author (TEXT)
- podcast_cover_url (TEXT, nullable)
- google_tts_api_key (TEXT, encrypted)
- elevenlabs_api_key (TEXT, encrypted, nullable)
- default_tts_provider (ENUM: 'google', 'elevenlabs')
- google_voice_name (TEXT) - ex: 'fr-FR-Neural2-A'
- elevenlabs_voice_id (TEXT, nullable)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

---

## Architecture des API Routes (Vercel)

### `/api/articles/add`
- Méthode : POST
- Input : { url: string }
- Processus :
  1. Fetch HTML de l'URL
  2. Extraction contenu avec Readability
  3. Nettoyage du texte (suppression balises, formatage pour TTS)
  4. Insertion en base avec status 'pending'
- Output : { articleId, title }

### `/api/articles/list`
- Méthode : GET
- Output : Liste des articles avec leurs épisodes associés

### `/api/articles/delete`
- Méthode : DELETE
- Input : { articleId: string }
- Processus : Suppression article + épisode + fichier audio R2

### `/api/episodes/generate`
- Méthode : POST
- Input : { articleId: string, ttsProvider?: 'google' | 'elevenlabs' }
- Processus asynchrone :
  1. Récupération article depuis DB
  2. Appel API TTS (Google ou ElevenLabs selon config)
  3. Normalisation audio (-16 LUFS, mono, 128kbps MP3)
  4. Upload vers Cloudflare R2
  5. Mise à jour DB avec audio_url et status 'completed'
- Output : { episodeId, status }
- Note : Utiliser un système de queue ou webhook pour gérer timeout Vercel (10s)

### `/api/episodes/batch-generate`
- Méthode : POST
- Input : { articleIds: string[] }
- Processus : Lance génération pour plusieurs articles en parallèle (limité à 3-5 simultanés)

### `/api/settings/get`
- Méthode : GET
- Output : Configuration utilisateur (sans clés API en clair)

### `/api/settings/update`
- Méthode : PUT
- Input : Partial<Settings>
- Processus : Mise à jour configuration avec encryption des clés API

### `/api/feed/rss`
- Méthode : GET
- Output : XML RSS feed conforme Apple Podcasts
- Structure :
  - Métadonnées podcast (titre, description, auteur, cover)
  - Items pour chaque épisode complété (title, description, enclosure URL, duration, pubDate)
- Cache : Réponse mise en cache 5 minutes

---

## Workflow de traitement

### Extraction d'article
1. User soumet URL
2. Fetch HTML via fetch()
3. Parse avec jsdom
4. Extraction contenu principal via Readability
5. Nettoyage :
   - Suppression tags HTML résiduels
   - Remplacement URLs par "lien disponible dans la description"
   - Suppression caractères spéciaux problématiques pour TTS
   - Ajout ponctuation si manquante (meilleure prosodie)
6. Sauvegarde en DB

### Génération audio
1. Récupération settings (API keys, voice ID)
2. Découpage texte en chunks si >5000 caractères (limite API)
3. Appel API TTS (Google Cloud ou ElevenLabs)
4. Concaténation des chunks audio si nécessaire
5. Normalisation audio avec ffmpeg ou libraire équivalente
6. Génération nom fichier unique : `episode-{uuid}.mp3`
7. Upload vers Cloudflare R2 avec ACL public-read
8. Récupération URL publique
9. Mise à jour DB

### Génération RSS
1. Query tous les épisodes avec status 'completed'
2. Construction XML selon spec Apple Podcasts
3. Inclusion métadonnées podcast depuis settings
4. Pour chaque épisode : title, description, audio URL, duration, pubDate
5. Servir avec Content-Type: application/rss+xml

---

## Interface utilisateur (Pages React)

### Page `/` - Dashboard
**Composants :**
- Header avec titre et lien vers settings
- Formulaire d'ajout article (input URL + bouton)
- Liste des articles avec :
  - Titre, URL, date d'ajout
  - Status épisode (pending/processing/completed/failed)
  - Bouton "Générer audio" si pending
  - Player audio intégré si completed
  - Bouton suppression
- Bouton "Générer tout" (batch)
- Section RSS feed avec URL copiable

### Page `/settings` - Configuration
**Sections :**
- Métadonnées podcast (titre, description, auteur)
- Upload cover image (optionnel)
- Configuration TTS :
  - Provider par défaut (radio: Google / ElevenLabs)
  - Google Cloud TTS API Key (input password)
  - Google Voice Name (dropdown avec voix FR disponibles)
  - ElevenLabs API Key (input password, optionnel)
  - ElevenLabs Voice ID (input text, optionnel)
- Bouton "Sauvegarder"
- Bouton "Tester voix" (génère échantillon audio court)

### Composants réutilisables
- `ArticleCard` : Affichage article avec status et actions
- `AudioPlayer` : Player HTML5 avec controls
- `LoadingSpinner` : Indicateur chargement
- `Toast` : Notifications succès/erreur
- `SettingsForm` : Formulaire configuration avec validation

---

## Fonctionnalités MVP

### Phase 1 - Core (Obligatoire)
- ✅ Ajout article via URL
- ✅ Extraction contenu avec Readability
- ✅ Génération audio avec Google Cloud TTS
- ✅ Stockage audio sur Cloudflare R2
- ✅ Génération flux RSS valide
- ✅ Interface dashboard basique
- ✅ Configuration clés API
- ✅ Player audio intégré

### Phase 2 - Améliorations (Nice-to-have)
- Support ElevenLabs en option
- Ajout texte brut (paste direct sans URL)
- Batch generation (plusieurs articles)
- Preview texte avant génération
- Édition manuelle du texte extrait
- Upload cover image personnalisée
- Statistiques basiques (nombre épisodes, durée totale)

### Phase 3 - Future (Non prioritaire)
- Support multi-langues
- Import RSS automatique (cron)
- Gestion file d'attente avec progression
- Export ZIP de tous les MP3
- PWA pour écoute offline

---

## Considérations techniques

### Sécurité
- Encryption clés API en base (libsodium ou crypto-js)
- Validation URLs (whitelist domaines si possible)
- Rate limiting sur endpoints (Vercel Edge Config)
- Sanitization input utilisateur
- CORS configuré pour domaine principal uniquement

### Performance
- Cache RSS feed (5 min)
- Lazy loading liste articles (pagination si >50)
- Compression images cover
- Utilisation Edge Functions Vercel si possible
- Optimisation bundle React (code splitting)

### Gestion erreurs
- Retry automatique appels TTS (3 tentatives max)
- Logging erreurs vers service externe (Sentry ou Vercel Analytics)
- Messages d'erreur utilisateur explicites
- Fallback gracieux si service indisponible
- Validation format MP3 après génération

### Limites à implémenter
- Taille max article : 50 000 caractères
- Durée max audio : 2 heures
- Nombre max articles stockés : 100 (configurable)
- Rate limit : 10 générations/heure

### Audio spécifications
- Format : MP3 mono, 128 kbps, 44.1 kHz
- Loudness : -16 LUFS (standard podcast)
- True peak : -1 dBTP
- Ajout pauses entre paragraphes (500ms)

---

## Variables d'environnement requises

```
# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=

# Google Cloud TTS (optionnel, peut être en DB)
GOOGLE_TTS_API_KEY=

# ElevenLabs (optionnel, peut être en DB)
ELEVENLABS_API_KEY=

# App Config
APP_URL=https://podcast.example.com
ENCRYPTION_KEY= # Pour encryption clés en DB
```

---

## Livrables attendus

1. Application React/TypeScript avec Tailwind CSS
2. API Routes Vercel fonctionnelles
3. Schéma Supabase avec migrations SQL
4. Configuration Cloudflare R2
5. Documentation déploiement Vercel
6. README avec instructions setup et configuration
7. Variables d'environnement template (.env.example)

---

## Contraintes absolues

- ❌ Pas d'Azure (Cloud, Cognitive Services, etc.)
- ❌ Pas de framework backend lourd (Express, NestJS) - Vercel Serverless uniquement
- ❌ Pas de Docker (déploiement Vercel natif)
- ✅ Full TypeScript (typage strict)
- ✅ Google Cloud TTS par défaut
- ✅ Mobile responsive (Tailwind)
- ✅ Code propre et maintenable