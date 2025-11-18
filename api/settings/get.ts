import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createServerClient } from '../../src/lib/supabase.js';
import type { GetSettingsResponse, ApiError } from '../../src/types/index.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' } as ApiError);
  }

  try {
    const supabase = createServerClient();

    const { data: settings, error } = await supabase
      .from('settings')
      .select('*')
      .eq('user_id', 'default-user')
      .single();

    if (error || !settings) {
      return res.status(404).json({ error: 'Settings not found' } as ApiError);
    }

    // Return settings without exposing API keys
    const sanitizedSettings = {
      id: settings.id,
      user_id: settings.user_id,
      podcast_title: settings.podcast_title,
      podcast_description: settings.podcast_description,
      podcast_author: settings.podcast_author,
      podcast_cover_url: settings.podcast_cover_url,
      default_tts_provider: settings.default_tts_provider,
      google_voice_name: settings.google_voice_name,
      elevenlabs_voice_id: settings.elevenlabs_voice_id,
      created_at: settings.created_at,
      updated_at: settings.updated_at,
      has_google_key: !!settings.google_tts_api_key,
      has_elevenlabs_key: !!settings.elevenlabs_api_key,
    };

    return res.status(200).json({
      settings: sanitizedSettings,
    } as GetSettingsResponse);
  } catch (error) {
    console.error('Error getting settings:', error);
    return res.status(500).json({
      error: 'Failed to get settings',
      details: error instanceof Error ? error.message : 'Unknown error',
    } as ApiError);
  }
}
