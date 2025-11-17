# Auditicle - Article-to-Audio Podcast Generator

Transform web articles into audio podcast episodes with automatic RSS feed generation.

## Features

### Core Features (Phase 1)
- Extract article content from any URL using Mozilla Readability
- Generate audio episodes using Google Cloud TTS or ElevenLabs
- Store audio files on Cloudflare R2
- Automatic RSS feed generation for podcast apps
- Batch generation for multiple articles
- Clean, responsive UI built with React and Tailwind CSS

### Phase 2 Improvements
- ✅ **Text Article Input** - Paste article content directly without a URL
- ✅ **Text Preview & Editing** - Preview and edit article content before generating audio
- ✅ **Cover Image Upload** - Upload custom podcast cover images (JPG, PNG, WebP)
- ✅ **Statistics Dashboard** - View total articles, episodes, duration, and storage usage
- ✅ **ElevenLabs Support** - Use ElevenLabs for premium voice quality (optional)

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Vercel Serverless Functions
- **Database**: Supabase (PostgreSQL)
- **Audio Storage**: Cloudflare R2 (S3-compatible)
- **TTS**: Google Cloud Text-to-Speech + ElevenLabs (optional)

## Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- Cloudflare R2 account
- Google Cloud TTS API key
- ElevenLabs API key (optional)

## Setup Instructions

### 1. Clone and Install

```bash
git clone <repository-url>
cd auditicle
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required environment variables:

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_KEY=your-service-key-here

# Cloudflare R2
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key-id
R2_SECRET_ACCESS_KEY=your-secret-access-key
R2_BUCKET_NAME=auditicle-audio
R2_PUBLIC_URL=https://your-bucket.r2.dev

# App Config
VITE_APP_URL=http://localhost:3000
ENCRYPTION_KEY=your-32-character-encryption-key-here
```

### 3. Database Setup

1. Create a new Supabase project
2. Run the initial migration file: `supabase/migrations/20240101000000_initial_schema.sql` in the Supabase SQL editor
3. Run the Phase 2 migration file: `supabase/migrations/20250117000000_phase2_improvements.sql`
4. This will create all necessary tables, indexes, and policies

### 4. Cloudflare R2 Setup

1. Create a new R2 bucket in your Cloudflare dashboard
2. Configure public access for the bucket
3. Create API tokens with read/write permissions
4. Note your bucket's public URL

### 5. Google Cloud TTS Setup

1. Create a Google Cloud project
2. Enable the Text-to-Speech API
3. Create an API key
4. Available French voices:
   - `fr-FR-Neural2-A` (Female)
   - `fr-FR-Neural2-B` (Male)
   - `fr-FR-Neural2-C` (Female)
   - `fr-FR-Neural2-D` (Male)

### 6. ElevenLabs Setup (Optional)

1. Create an ElevenLabs account
2. Get your API key from the dashboard
3. Choose a voice ID from your available voices

### 7. Development

Run the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### 8. Deployment

Deploy to Vercel:

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel
```

Make sure to add all environment variables in your Vercel project settings.

## Usage

### Adding Articles

#### From URL
1. Navigate to the dashboard
2. Paste an article URL in the input field
3. Click "Add from URL"
4. The article content will be extracted automatically

#### From Text (NEW)
1. Navigate to the dashboard
2. Click "Add Text Article"
3. Enter the title, author (optional), and content
4. Click "Add Article"
5. The article will be marked as editable

### Generating Audio

1. Click "Generate Audio" on any article card
2. The audio will be generated using your default TTS provider
3. Once completed, you can play or download the audio

### Batch Generation

Click "Generate All Pending" to process multiple articles at once.

### RSS Feed

1. Copy the RSS feed URL from the dashboard
2. Add it to your favorite podcast app
3. New episodes will appear automatically

### Preview & Edit Articles (NEW)

1. Click the "Preview" or "Edit" button on any article card
2. View the article title, author, and full content
3. If the article is editable (text-based), you can modify the content
4. Click "Save Changes" to update the article

### Statistics Dashboard (NEW)

The dashboard now displays:
- Total number of articles
- Total number of episodes
- Number of completed episodes
- Total audio duration
- Total storage used
- Completion rate progress bar

### Settings

Configure your podcast metadata and TTS settings:
- Podcast title, description, and author
- **Cover image upload** (NEW) - Upload JPG, PNG, or WebP images up to 5MB
- Cover image URL (alternative to upload)
- TTS provider (Google or ElevenLabs)
- API keys and voice settings

## API Routes

### Articles
- `POST /api/articles/add` - Add a new article (from URL or text)
- `GET /api/articles/list` - List all articles
- `PUT /api/articles/update` - Update article content (NEW)
- `DELETE /api/articles/delete` - Delete an article

### Episodes
- `POST /api/episodes/generate` - Generate audio for an article
- `POST /api/episodes/batch-generate` - Generate audio for multiple articles

### Settings
- `GET /api/settings/get` - Get settings
- `PUT /api/settings/update` - Update settings
- `POST /api/settings/upload-cover` - Upload cover image (NEW)

### Statistics
- `GET /api/statistics/get` - Get statistics (NEW)

### Feed
- `GET /api/feed/rss` - Get RSS feed

## Project Structure

```
auditicle/
├── api/                           # Vercel serverless functions
│   ├── articles/
│   │   ├── add.ts                # Add article (URL or text)
│   │   ├── list.ts               # List articles
│   │   ├── update.ts             # Update article (NEW)
│   │   └── delete.ts             # Delete article
│   ├── episodes/
│   │   ├── generate.ts           # Generate audio
│   │   └── batch-generate.ts    # Batch generation
│   ├── settings/
│   │   ├── get.ts                # Get settings
│   │   ├── update.ts             # Update settings
│   │   └── upload-cover.ts      # Upload cover (NEW)
│   ├── statistics/
│   │   └── get.ts                # Get statistics (NEW)
│   └── feed/
│       └── rss.ts                # RSS feed
├── src/
│   ├── components/
│   │   ├── ArticleCard.tsx       # Article display
│   │   ├── AudioPlayer.tsx       # Audio player
│   │   ├── LoadingSpinner.tsx    # Loading indicator
│   │   ├── SettingsForm.tsx      # Settings form
│   │   ├── Toast.tsx             # Toast notifications
│   │   ├── AddTextArticleModal.tsx   # Add text article (NEW)
│   │   ├── EditArticleModal.tsx      # Edit/preview article (NEW)
│   │   └── StatisticsCard.tsx        # Statistics display (NEW)
│   ├── pages/
│   │   ├── Dashboard.tsx         # Main page
│   │   └── Settings.tsx          # Settings page
│   ├── lib/                      # Library code
│   │   ├── supabase.ts           # Supabase client
│   │   ├── r2.ts                 # R2 client
│   │   └── tts/                  # TTS providers
│   ├── utils/                    # Utility functions
│   │   ├── content-extraction.ts # Article extraction
│   │   └── encryption.ts         # API key encryption
│   ├── types/                    # TypeScript types
│   │   ├── database.types.ts     # Database types
│   │   └── api.types.ts          # API types
│   ├── store/                    # Zustand stores
│   │   └── toast.ts              # Toast store
│   └── vite-env.d.ts             # Vite environment types
├── supabase/
│   └── migrations/
│       ├── 20240101000000_initial_schema.sql       # Initial schema
│       └── 20250117000000_phase2_improvements.sql  # Phase 2 (NEW)
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── vercel.json
```

## Security Features

- API keys encrypted at rest using AES-256-GCM
- Row Level Security (RLS) enabled on Supabase
- Input validation and sanitization
- CORS configuration
- Environment variable validation

## Limitations

- Maximum article size: 50,000 characters
- Maximum audio duration: 2 hours
- Rate limit: 10 generations per hour (configurable)
- Supported audio format: MP3 (mono, 128kbps)

## Troubleshooting

### Articles not extracting properly
- Ensure the URL is accessible
- Some sites may block scraping
- Check browser console for errors

### Audio generation failing
- Verify API keys are correct
- Check TTS provider rate limits
- Review error messages in episode card

### RSS feed not updating
- Wait 5 minutes for cache to expire
- Verify episodes have status "completed"
- Check podcast app refresh settings

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.
