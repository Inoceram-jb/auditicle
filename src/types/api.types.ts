import { TTSProvider, EpisodeStatus, ArticleWithEpisode, Settings } from './database.types';

// API Request types
export interface AddArticleRequest {
  url: string;
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
