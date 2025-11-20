import { TTSProvider, EpisodeStatus, ArticleWithEpisode, Settings } from './supabase.js';

// API Request types
export interface AddArticleRequest {
  url?: string;
  title?: string;
  content?: string;
  author?: string;
  source_type?: 'url' | 'text';
}

export interface DeleteArticleRequest {
  articleId: string;
}

export interface GenerateEpisodeRequest {
  articleId: string;
  ttsProvider?: TTSProvider;
}

export interface BatchGenerateRequest {
  articleIds: string[];
}

export interface UpdateSettingsRequest extends Partial<Omit<Settings, 'id' | 'user_id' | 'created_at' | 'updated_at'>> {}

export interface UpdateArticleRequest {
  articleId: string;
  title?: string;
  content?: string;
  author?: string;
}

export interface GetStatisticsResponse {
  total_articles: number;
  total_episodes: number;
  completed_episodes: number;
  total_duration: number;
  total_size: number;
}

// API Response types
export interface AddArticleResponse {
  articleId: string;
  title: string;
}

export interface ListArticlesResponse {
  articles: ArticleWithEpisode[];
}

export interface GenerateEpisodeResponse {
  episodeId: string;
  status: EpisodeStatus;
}

export interface GetSettingsResponse {
  settings: Omit<Settings, 'google_tts_api_key' | 'elevenlabs_api_key'> & {
    has_google_key: boolean;
    has_elevenlabs_key: boolean;
  };
}

export interface ApiError {
  error: string;
  details?: string;
}
