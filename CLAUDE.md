# CLAUDE.md - Auditicle Development Guide

## Project Overview

**Auditicle** is an Article-to-Audio Podcast Generator that transforms web articles into audio podcast episodes with automatic RSS feed generation. It's designed for personal use to listen to articles during commutes.

### Key Features
- Extract article content from URLs using Mozilla Readability
- Generate audio episodes using Google Cloud TTS or ElevenLabs
- Store audio files on Cloudflare R2 (S3-compatible)
- Automatic RSS feed generation for podcast apps
- Batch generation for multiple articles
- Clean, responsive UI built with React and Tailwind CSS

---

## Tech Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with custom primary color palette
- **Routing**: React Router DOM v6
- **State Management**: Zustand (lightweight, used for toast notifications)
- **HTTP Client**: Native Fetch API

### Backend
- **Platform**: Vercel Serverless Functions
- **Runtime**: Node.js 18+
- **Language**: TypeScript (strict mode enabled)
- **API Style**: REST endpoints

### Database
- **Service**: Supabase (PostgreSQL)
- **Client**: @supabase/supabase-js v2.45.4
- **Schema**: Three main tables (articles, episodes, settings)
- **Security**: Row Level Security (RLS) enabled

### Storage
- **Service**: Cloudflare R2 (S3-compatible)
- **SDK**: @aws-sdk/client-s3
- **Format**: MP3 files (mono, 128kbps)
- **Access**: Public read access

### External Services
- **Primary TTS**: Google Cloud Text-to-Speech API
- **Premium TTS**: ElevenLabs API (optional)
- **Content Extraction**: @mozilla/readability + jsdom

---

## Directory Structure

```
auditicle/
├── api/                          # Vercel serverless functions (backend)
│   ├── articles/
│   │   ├── add.ts               # POST - Add new article from URL
│   │   ├── list.ts              # GET - List all articles with episodes
│   │   └── delete.ts            # DELETE - Remove article and audio
│   ├── episodes/
│   │   ├── generate.ts          # POST - Generate audio for single article
│   │   └── batch-generate.ts   # POST - Generate audio for multiple articles
│   ├── settings/
│   │   ├── get.ts               # GET - Retrieve user settings
│   │   └── update.ts            # PUT - Update user settings
│   └── feed/
│       └── rss.ts               # GET - Generate RSS feed XML
│
├── src/                          # Frontend React application
│   ├── components/              # Reusable React components
│   │   ├── ArticleCard.tsx     # Article display with status and actions
│   │   ├── AudioPlayer.tsx     # HTML5 audio player component
│   │   ├── LoadingSpinner.tsx  # Loading indicator
│   │   ├── SettingsForm.tsx    # Settings configuration form
│   │   └── Toast.tsx           # Toast notification system
│   │
│   ├── pages/                   # Page components (routes)
│   │   ├── Dashboard.tsx       # Main page - article list and management
│   │   └── Settings.tsx        # Settings page - configuration
│   │
│   ├── lib/                     # Library integrations
│   │   ├── supabase.ts         # Supabase client setup
│   │   ├── r2.ts               # Cloudflare R2 client
│   │   └── tts/
│   │       ├── index.ts        # TTS provider abstraction
│   │       ├── google.ts       # Google Cloud TTS implementation
│   │       └── elevenlabs.ts   # ElevenLabs implementation
│   │
│   ├── utils/                   # Utility functions
│   │   ├── content-extraction.ts  # Article extraction and cleaning
│   │   └── encryption.ts       # AES-256-GCM encryption for API keys
│   │
│   ├── types/                   # TypeScript type definitions
│   │   ├── index.ts            # Main type exports
│   │   ├── database.types.ts   # Database schema types
│   │   └── api.types.ts        # API request/response types
│   │
│   ├── store/                   # Zustand state stores
│   │   └── toast.ts            # Toast notification store
│   │
│   ├── styles/                  # Global CSS files
│   ├── App.tsx                  # Main app component with routing
│   └── main.tsx                 # Application entry point
│
├── supabase/
│   └── migrations/
│       └── 20240101000000_initial_schema.sql  # Database schema
│
├── .env.example                 # Environment variables template
├── package.json                 # Dependencies and scripts
├── vite.config.ts              # Vite configuration
├── tailwind.config.js          # Tailwind CSS configuration
├── tsconfig.json               # TypeScript configuration
├── vercel.json                 # Vercel deployment configuration
└── TODO.md                     # Original project specification (French)
```

---

## Database Schema

### Table: `articles`
Stores extracted article content.

```sql
CREATE TABLE articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,        -- Cleaned content ready for TTS
    author TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Indexes**:
- `idx_articles_created_at` on `created_at DESC`
- `idx_articles_url` on `url`

### Table: `episodes`
Stores audio episode metadata and status.

```sql
CREATE TABLE episodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    audio_url TEXT NOT NULL,
    duration INTEGER NOT NULL DEFAULT 0,
    file_size INTEGER NOT NULL DEFAULT 0,
    status episode_status NOT NULL DEFAULT 'pending',  -- pending, processing, completed, failed
    tts_provider tts_provider NOT NULL,                 -- google, elevenlabs
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(article_id)
);
```

**Indexes**:
- `idx_episodes_article_id` on `article_id`
- `idx_episodes_status` on `status`
- `idx_episodes_created_at` on `created_at DESC`

### Table: `settings`
Stores user configuration and encrypted API keys.

```sql
CREATE TABLE settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT UNIQUE NOT NULL,
    podcast_title TEXT NOT NULL DEFAULT 'My Podcast',
    podcast_description TEXT NOT NULL DEFAULT 'Articles converted to audio',
    podcast_author TEXT NOT NULL DEFAULT 'Auditicle User',
    podcast_cover_url TEXT,
    google_tts_api_key TEXT NOT NULL,        -- Encrypted with AES-256-GCM
    elevenlabs_api_key TEXT,                 -- Encrypted, optional
    default_tts_provider tts_provider NOT NULL DEFAULT 'google',
    google_voice_name TEXT NOT NULL DEFAULT 'fr-FR-Neural2-A',
    elevenlabs_voice_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Indexes**:
- `idx_settings_user_id` on `user_id`

**Trigger**: `update_settings_updated_at` automatically updates `updated_at` on row modification.

---

## API Endpoints

All endpoints are Vercel serverless functions located in the `/api` directory.

### Articles

#### `POST /api/articles/add`
Add a new article from URL.

**Request**:
```typescript
{ url: string }
```

**Process**:
1. Validate URL format
2. Check if article already exists (return existing if found)
3. Fetch HTML content
4. Extract with Mozilla Readability
5. Clean content for TTS (remove HTML, special chars)
6. Validate character limit (max 50,000)
7. Insert article into database
8. Create pending episode record

**Response**:
```typescript
{ articleId: string, title: string }
```

#### `GET /api/articles/list`
List all articles with their associated episodes.

**Response**:
```typescript
{ articles: ArticleWithEpisode[] }
```

#### `DELETE /api/articles/delete`
Delete an article, its episode, and audio file.

**Request**:
```typescript
{ articleId: string }
```

**Process**:
1. Fetch episode to get audio URL
2. Delete audio file from R2
3. Delete database records (cascade handles episode)

### Episodes

#### `POST /api/episodes/generate`
Generate audio for a single article.

**Request**:
```typescript
{
  articleId: string,
  ttsProvider?: 'google' | 'elevenlabs'
}
```

**Process**:
1. Update episode status to 'processing'
2. Fetch article content and settings
3. Decrypt API keys
4. Call TTS provider API
5. Upload MP3 to Cloudflare R2
6. Update episode with audio_url, duration, file_size
7. Set status to 'completed' (or 'failed' with error_message)

**Response**:
```typescript
{ episodeId: string, status: EpisodeStatus }
```

#### `POST /api/episodes/batch-generate`
Generate audio for multiple articles.

**Request**:
```typescript
{ articleIds: string[] }
```

**Process**: Calls `/api/episodes/generate` for each article (limited concurrency).

### Settings

#### `GET /api/settings/get`
Retrieve user settings (API keys excluded for security).

**Response**:
```typescript
{
  settings: Omit<Settings, 'google_tts_api_key' | 'elevenlabs_api_key'> & {
    has_google_key: boolean,
    has_elevenlabs_key: boolean
  }
}
```

#### `PUT /api/settings/update`
Update user settings.

**Request**:
```typescript
Partial<Settings>  // Excluding id, user_id, created_at, updated_at
```

**Process**:
1. Validate input
2. Encrypt API keys if provided
3. Update database
4. Return success status

### Feed

#### `GET /api/feed/rss`
Generate RSS feed for completed episodes.

**Headers**:
- `Content-Type: application/rss+xml`
- `Cache-Control: s-maxage=300, stale-while-revalidate` (5 min cache)

**Process**:
1. Fetch settings for podcast metadata
2. Query completed episodes
3. Generate Apple Podcasts-compliant RSS XML
4. Return XML response

---

## Data Flow & Architecture

### Article Addition Flow
```
User enters URL
    ↓
POST /api/articles/add
    ↓
Fetch HTML → Parse with Readability → Clean content
    ↓
Insert article + Create pending episode
    ↓
Return to frontend
```

### Audio Generation Flow
```
User clicks "Generate Audio"
    ↓
POST /api/episodes/generate
    ↓
Update status: processing
    ↓
Fetch settings → Decrypt API keys
    ↓
Call TTS API (Google/ElevenLabs)
    ↓
Upload MP3 to R2
    ↓
Update episode: completed + audio_url
    ↓
Return to frontend
```

### RSS Feed Flow
```
Podcast app requests feed
    ↓
GET /api/feed/rss
    ↓
Query completed episodes + settings
    ↓
Generate XML (cached 5 min)
    ↓
Return RSS feed
```

---

## Key Conventions & Patterns

### TypeScript
- **Strict mode enabled**: All code must pass strict TypeScript checks
- **Type definitions**: All types defined in `src/types/`
- **No implicit any**: Always provide explicit types
- **Interface over type**: Prefer `interface` for object shapes

### File Naming
- Components: PascalCase (e.g., `ArticleCard.tsx`)
- Utilities: kebab-case (e.g., `content-extraction.ts`)
- API routes: kebab-case (e.g., `batch-generate.ts`)

### Code Organization
- **Separation of concerns**: API routes handle backend logic, components handle UI
- **Reusable components**: All UI components in `src/components/`
- **Single responsibility**: Each API route handles one specific operation
- **Type safety**: Request/response types defined in `api.types.ts`

### State Management
- **Local state**: Use React hooks (`useState`, `useEffect`) for component-local state
- **Global state**: Zustand store only for toast notifications (lightweight approach)
- **Server state**: Fetch data on demand, no global caching layer (keep it simple)

### Styling
- **Tailwind CSS**: All styling via Tailwind utility classes
- **Custom colors**: Use `primary-*` color scale (defined in `tailwind.config.js`)
- **Responsive**: Mobile-first approach with Tailwind breakpoints
- **No CSS modules**: Pure Tailwind utilities

### Error Handling
- **API errors**: Always return `ApiError` type with `error` and optional `details`
- **Try-catch**: Wrap all async operations in try-catch blocks
- **User feedback**: Use toast notifications for success/error messages
- **Logging**: `console.error` for server-side errors

### Security
- **Encryption**: API keys encrypted at rest using AES-256-GCM
- **Environment variables**: Sensitive keys in env vars, never committed
- **Input validation**: All user inputs validated before processing
- **RLS**: Row Level Security enabled on all Supabase tables
- **URL validation**: Check URL format before fetching

---

## Environment Variables

### Required Variables

**Frontend** (prefix with `VITE_`):
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_APP_URL=http://localhost:3000
```

**Backend** (API routes):
```bash
SUPABASE_SERVICE_KEY=your-service-key-here
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key-id
R2_SECRET_ACCESS_KEY=your-secret-access-key
R2_BUCKET_NAME=auditicle-audio
R2_PUBLIC_URL=https://your-bucket.r2.dev
ENCRYPTION_KEY=your-32-character-encryption-key-here
```

**Optional** (can be stored in database instead):
```bash
GOOGLE_TTS_API_KEY=your-google-api-key
ELEVENLABS_API_KEY=your-elevenlabs-api-key
```

**Note**: Copy `.env.example` to `.env` and fill in values.

---

## Development Workflow

### Initial Setup
```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Run Supabase migration
# Go to Supabase SQL editor and run:
# supabase/migrations/20240101000000_initial_schema.sql
```

### Development Server
```bash
# Start dev server (runs on port 3000)
npm run dev
```

**Dev server features**:
- Hot module replacement
- API proxy to `/api/*` endpoints
- TypeScript type checking
- Vite fast refresh

### Type Checking
```bash
# Check TypeScript types without emitting
npm run type-check
```

### Linting
```bash
# Run ESLint
npm run lint
```

### Building
```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

### Deployment
```bash
# Deploy to Vercel
vercel

# Or push to main branch (automatic deployment if Vercel integration enabled)
git push origin main
```

**Important**: Add all environment variables in Vercel project settings.

---

## Testing Considerations

Currently, the project has no automated tests. When adding tests, consider:

### Unit Tests (Recommended)
- Utility functions (`encryption.ts`, `content-extraction.ts`)
- TTS provider abstractions
- Type guards and validators

### Integration Tests (Recommended)
- API endpoints (mock Supabase and R2)
- Content extraction from sample URLs
- RSS feed generation

### E2E Tests (Optional)
- Full article addition flow
- Audio generation flow
- Settings update flow

**Tools to consider**: Vitest (unit), Playwright (E2E)

---

## Common Development Tasks

### Adding a New API Endpoint

1. Create file in `/api/[category]/[name].ts`
2. Define types in `src/types/api.types.ts`
3. Implement handler with error handling
4. Export default function
5. Update this documentation

**Template**:
```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { ApiError } from '../../src/types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' } as ApiError);
  }

  try {
    // Implementation
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({
      error: 'Failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    } as ApiError);
  }
}
```

### Adding a New React Component

1. Create file in `src/components/[ComponentName].tsx`
2. Use TypeScript with proper prop types
3. Style with Tailwind CSS
4. Export as named export
5. Import in parent component

**Template**:
```typescript
interface Props {
  title: string;
  onAction?: () => void;
}

export function MyComponent({ title, onAction }: Props) {
  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
      {onAction && (
        <button
          onClick={onAction}
          className="mt-2 px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
        >
          Action
        </button>
      )}
    </div>
  );
}
```

### Modifying Database Schema

1. Update `supabase/migrations/` with new SQL file
2. Run migration in Supabase SQL editor
3. Update types in `src/types/database.types.ts`
4. Update affected API endpoints
5. Update frontend components

### Adding a New TTS Provider

1. Create implementation in `src/lib/tts/[provider].ts`
2. Export provider in `src/lib/tts/index.ts`
3. Update `TTSProvider` enum in types
4. Add API key fields to settings table
5. Update settings form UI
6. Update episode generation logic

---

## Important Limitations & Constraints

### Technical Limits
- **Article size**: Maximum 50,000 characters
- **Audio duration**: Maximum 2 hours
- **Rate limit**: 10 generations per hour (configurable)
- **Supported format**: MP3 only (mono, 128kbps, 44.1kHz)

### Platform Constraints
- **Vercel timeout**: 10 seconds for Hobby tier, 60 seconds for Pro
  - For long audio generation, consider implementing queue system
- **Supabase RLS**: All queries must respect Row Level Security policies
- **R2 public access**: Bucket must have public read access configured

### Design Decisions
- **No authentication**: Single-user application (RLS policies allow all)
- **No real-time updates**: Use polling or manual refresh
- **No audio editing**: Generated audio is final
- **No multi-language UI**: French and English in code, but UI is English

### Absolute Constraints (from TODO.md)
- ❌ **No Azure services** (Cloud, Cognitive Services, etc.)
- ❌ **No backend frameworks** (Express, NestJS) - Vercel Serverless only
- ❌ **No Docker** - Use Vercel native deployment
- ✅ **Full TypeScript** with strict typing
- ✅ **Google Cloud TTS** as default provider
- ✅ **Mobile responsive** design

---

## Troubleshooting Guide

### Articles Not Extracting Properly
- **Check URL accessibility**: Some sites block scraping
- **Verify Readability**: Not all sites are compatible
- **Check console errors**: Browser console shows fetch errors
- **Test with different articles**: Try known-good URLs

### Audio Generation Failing
- **Verify API keys**: Check settings page, ensure keys are saved
- **Check TTS quotas**: Google/ElevenLabs have rate limits
- **Review error messages**: Episode card shows error details
- **Check R2 permissions**: Ensure bucket has write access

### RSS Feed Not Updating
- **Wait for cache**: 5-minute cache on RSS endpoint
- **Verify episode status**: Only 'completed' episodes appear
- **Check podcast app**: Some apps cache feeds aggressively
- **Validate XML**: Use RSS validator tool

### Environment Variable Issues
- **Frontend vars**: Must prefix with `VITE_` to be accessible
- **Build time**: Frontend vars baked in at build time, not runtime
- **Vercel deployment**: Add all vars in project settings
- **Local dev**: Ensure `.env` exists and has all required vars

### Database Connection Issues
- **Check Supabase URL**: Must match project URL exactly
- **Verify keys**: Anon key for frontend, service key for backend
- **RLS policies**: Ensure policies allow intended operations
- **Check migration**: Ensure schema migration was run

---

## AI Assistant Guidelines

When working on this codebase, AI assistants should:

### Code Modifications
1. **Always read files before editing**: Never assume file content
2. **Preserve existing patterns**: Follow established conventions
3. **Maintain type safety**: Ensure all changes pass TypeScript strict checks
4. **Test locally**: Encourage running `npm run type-check` after changes
5. **Update documentation**: If adding features, update this file

### Understanding Context
1. **Read TODO.md**: Contains original French specification and rationale
2. **Check types first**: Types in `src/types/` explain data structures
3. **Review API flow**: Understand request → API → database → response
4. **Consider security**: Validate inputs, encrypt sensitive data

### Making Suggestions
1. **Respect constraints**: Don't suggest Azure, Docker, or forbidden tech
2. **Keep it simple**: This is a personal project, not enterprise software
3. **Consider Vercel limits**: Be aware of serverless function timeouts
4. **Maintain mobile-first**: All UI changes must be responsive

### Common Requests
- **"Add a feature"**: Check if it's in TODO.md Phase 2/3, consider MVP scope
- **"Fix a bug"**: Ask for error messages, check console logs, review error handling
- **"Optimize performance"**: Consider Vercel Edge Functions, caching, lazy loading
- **"Add authentication"**: Note that this is single-user by design
- **"Change database schema"**: Remind about migration process

### Best Practices
- **Read before write**: Always use Read tool before Edit/Write
- **Type check often**: Run `npm run type-check` to catch errors early
- **Test API endpoints**: Suggest using curl or Postman for testing
- **Verify environment**: Check `.env.example` for required variables
- **Consider edge cases**: Empty states, error states, loading states

---

## Additional Resources

### External Documentation
- [Vercel Functions](https://vercel.com/docs/functions)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Cloudflare R2 API](https://developers.cloudflare.com/r2/api/s3/api/)
- [Google Cloud TTS](https://cloud.google.com/text-to-speech/docs)
- [ElevenLabs API](https://elevenlabs.io/docs/api-reference/overview)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [React Router v6](https://reactrouter.com/en/main)
- [Zustand](https://github.com/pmndrs/zustand)

### Key Files to Reference
- **Project spec**: `TODO.md` (original French specification)
- **Setup guide**: `README.md` (user-facing documentation)
- **Database schema**: `supabase/migrations/20240101000000_initial_schema.sql`
- **Environment template**: `.env.example`
- **Type definitions**: `src/types/` directory
- **API implementation examples**: `api/articles/add.ts`, `api/episodes/generate.ts`

---

## Version History

**Current State**: Phase 1 (MVP) - Complete
- ✅ Core functionality implemented
- ✅ Google Cloud TTS integration
- ✅ Cloudflare R2 storage
- ✅ RSS feed generation
- ✅ Basic UI with dashboard and settings

**Future Phases** (see TODO.md):
- Phase 2: ElevenLabs support, batch generation, text preview/editing
- Phase 3: Multi-language, automated RSS import, PWA features

---

## Contact & Support

This is a personal project. For issues or questions:
1. Check this documentation first
2. Review TODO.md for design decisions
3. Check README.md for setup issues
4. Review code comments in relevant files
5. Open GitHub issue if needed

---

**Last Updated**: 2025-11-17
**Current Branch**: claude/claude-md-mi3oqq4dk3ncfx1l-01SM8WyPzuWtUHJCLJu1tUC3
**Documentation Version**: 1.0.0
