import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createServerClient } from '../../src/lib/supabase';
import { generateTTS } from '../../src/lib/tts';
import { uploadAudioToR2 } from '../../src/lib/r2';
import { decrypt } from '../../src/utils/encryption';
import type { GenerateEpisodeRequest, GenerateEpisodeResponse, ApiError } from '../../src/types';
import { randomUUID } from 'crypto';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' } as ApiError);
  }

  try {
    const { articleId, ttsProvider }: GenerateEpisodeRequest = req.body;

    if (!articleId || typeof articleId !== 'string') {
      return res.status(400).json({ error: 'Article ID is required' } as ApiError);
    }

    const supabase = createServerClient();

    // Get article
    const { data: article, error: articleError } = await supabase
      .from('articles')
      .select('*')
      .eq('id', articleId)
      .single();

    if (articleError || !article) {
      return res.status(404).json({ error: 'Article not found' } as ApiError);
    }

    // Get settings
    const { data: settings, error: settingsError } = await supabase
      .from('settings')
      .select('*')
      .eq('user_id', 'default-user')
      .single();

    if (settingsError || !settings) {
      return res.status(500).json({ error: 'Settings not found' } as ApiError);
    }

    const provider = ttsProvider || settings.default_tts_provider;

    // Get episode
    const { data: episode, error: episodeError } = await supabase
      .from('episodes')
      .select('*')
      .eq('article_id', articleId)
      .single();

    if (episodeError || !episode) {
      return res.status(404).json({ error: 'Episode not found' } as ApiError);
    }

    // Update status to processing
    await supabase
      .from('episodes')
      .update({ status: 'processing' })
      .eq('id', episode.id);

    try {
      // Decrypt API keys
      const apiKey = provider === 'google'
        ? decrypt(settings.google_tts_api_key)
        : settings.elevenlabs_api_key ? decrypt(settings.elevenlabs_api_key) : '';

      if (!apiKey) {
        throw new Error(`No API key found for provider: ${provider}`);
      }

      const voiceId = provider === 'google'
        ? settings.google_voice_name
        : settings.elevenlabs_voice_id || '';

      // Generate audio
      const audioBuffer = await generateTTS(article.content, {
        provider,
        apiKey,
        voiceId,
        languageCode: 'fr-FR',
      });

      // Calculate audio metadata
      const fileSize = audioBuffer.length;
      // Approximate duration: MP3 at 128kbps = ~16KB per second
      const duration = Math.round(fileSize / 16000);

      // Upload to R2
      const fileName = `episode-${randomUUID()}.mp3`;
      const audioUrl = await uploadAudioToR2(fileName, audioBuffer);

      // Update episode
      await supabase
        .from('episodes')
        .update({
          audio_url: audioUrl,
          duration,
          file_size: fileSize,
          status: 'completed',
          tts_provider: provider,
          completed_at: new Date().toISOString(),
          error_message: null,
        })
        .eq('id', episode.id);

      return res.status(200).json({
        episodeId: episode.id,
        status: 'completed',
      } as GenerateEpisodeResponse);
    } catch (error) {
      // Update episode with error
      await supabase
        .from('episodes')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
        })
        .eq('id', episode.id);

      throw error;
    }
  } catch (error) {
    console.error('Error generating episode:', error);
    return res.status(500).json({
      error: 'Failed to generate episode',
      details: error instanceof Error ? error.message : 'Unknown error',
    } as ApiError);
  }
}
