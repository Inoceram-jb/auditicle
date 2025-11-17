export type EpisodeStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type TTSProvider = 'google' | 'elevenlabs';

export interface Article {
  id: string;
  url: string;
  title: string;
  content: string;
  author: string | null;
  created_at: string;
}

export interface Episode {
  id: string;
  article_id: string;
  audio_url: string;
  duration: number;
  file_size: number;
  status: EpisodeStatus;
  tts_provider: TTSProvider;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface Settings {
  id: string;
  user_id: string;
  podcast_title: string;
  podcast_description: string;
  podcast_author: string;
  podcast_cover_url: string | null;
  google_tts_api_key: string;
  elevenlabs_api_key: string | null;
  default_tts_provider: TTSProvider;
  google_voice_name: string;
  elevenlabs_voice_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ArticleWithEpisode extends Article {
  episode?: Episode;
}

export interface Database {
  public: {
    Tables: {
      articles: {
        Row: Article;
        Insert: Omit<Article, 'id' | 'created_at'>;
        Update: Partial<Omit<Article, 'id' | 'created_at'>>;
      };
      episodes: {
        Row: Episode;
        Insert: Omit<Episode, 'id' | 'created_at'>;
        Update: Partial<Omit<Episode, 'id' | 'created_at'>>;
      };
      settings: {
        Row: Settings;
        Insert: Omit<Settings, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Settings, 'id' | 'created_at' | 'updated_at'>>;
      };
    };
  };
}
