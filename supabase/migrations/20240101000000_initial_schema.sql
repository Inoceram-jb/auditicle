-- Create custom types
CREATE TYPE episode_status AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE tts_provider AS ENUM ('google', 'elevenlabs');

-- Create articles table
CREATE TABLE articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create episodes table
CREATE TABLE episodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    audio_url TEXT NOT NULL,
    duration INTEGER NOT NULL DEFAULT 0,
    file_size INTEGER NOT NULL DEFAULT 0,
    status episode_status NOT NULL DEFAULT 'pending',
    tts_provider tts_provider NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(article_id)
);

-- Create settings table
CREATE TABLE settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT UNIQUE NOT NULL,
    podcast_title TEXT NOT NULL DEFAULT 'My Podcast',
    podcast_description TEXT NOT NULL DEFAULT 'Articles converted to audio',
    podcast_author TEXT NOT NULL DEFAULT 'Auditicle User',
    podcast_cover_url TEXT,
    google_tts_api_key TEXT NOT NULL,
    elevenlabs_api_key TEXT,
    default_tts_provider tts_provider NOT NULL DEFAULT 'google',
    google_voice_name TEXT NOT NULL DEFAULT 'fr-FR-Neural2-A',
    elevenlabs_voice_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_articles_created_at ON articles(created_at DESC);
CREATE INDEX idx_articles_url ON articles(url);
CREATE INDEX idx_episodes_article_id ON episodes(article_id);
CREATE INDEX idx_episodes_status ON episodes(status);
CREATE INDEX idx_episodes_created_at ON episodes(created_at DESC);
CREATE INDEX idx_settings_user_id ON settings(user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for settings table
CREATE TRIGGER update_settings_updated_at
    BEFORE UPDATE ON settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all for now - can be restricted later)
CREATE POLICY "Allow all operations on articles" ON articles FOR ALL USING (true);
CREATE POLICY "Allow all operations on episodes" ON episodes FOR ALL USING (true);
CREATE POLICY "Allow all operations on settings" ON settings FOR ALL USING (true);

-- Insert default settings row
INSERT INTO settings (
    user_id,
    podcast_title,
    podcast_description,
    podcast_author,
    google_tts_api_key,
    google_voice_name,
    default_tts_provider
) VALUES (
    'default-user',
    'Auditicle Podcast',
    'Transform your favorite articles into audio episodes',
    'Auditicle',
    'YOUR_API_KEY_HERE',
    'fr-FR-Neural2-A',
    'google'
);
