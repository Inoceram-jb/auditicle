import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createServerClient } from '../../src/lib/supabase.js';
import { encrypt } from '../../src/utils/encryption.js';
import type { UpdateSettingsRequest, ApiError } from '../../src/types/index.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' } as ApiError);
  }

  try {
    const updates: UpdateSettingsRequest = req.body;

    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ error: 'Invalid update data' } as ApiError);
    }

    const supabase = createServerClient();

    // Get current settings
    const { data: currentSettings, error: getError } = await supabase
      .from('settings')
      .select('*')
      .eq('user_id', 'default-user')
      .single();

    if (getError || !currentSettings) {
      return res.status(404).json({ error: 'Settings not found' } as ApiError);
    }

    // Prepare update object
    const updateData: any = {};

    // Handle regular fields
    if (updates.podcast_title !== undefined) updateData.podcast_title = updates.podcast_title;
    if (updates.podcast_description !== undefined) updateData.podcast_description = updates.podcast_description;
    if (updates.podcast_author !== undefined) updateData.podcast_author = updates.podcast_author;
    if (updates.podcast_cover_url !== undefined) updateData.podcast_cover_url = updates.podcast_cover_url;
    if (updates.default_tts_provider !== undefined) updateData.default_tts_provider = updates.default_tts_provider;
    if (updates.google_voice_name !== undefined) updateData.google_voice_name = updates.google_voice_name;
    if (updates.elevenlabs_voice_id !== undefined) updateData.elevenlabs_voice_id = updates.elevenlabs_voice_id;

    // Handle encrypted API keys
    if (updates.google_tts_api_key !== undefined) {
      updateData.google_tts_api_key = encrypt(updates.google_tts_api_key);
    }

    if (updates.elevenlabs_api_key !== undefined && updates.elevenlabs_api_key !== null) {
      updateData.elevenlabs_api_key = encrypt(updates.elevenlabs_api_key);
    }

    // Update settings
    const { error: updateError } = await supabase
      .from('settings')
      .update(updateData)
      .eq('user_id', 'default-user');

    if (updateError) {
      throw updateError;
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error updating settings:', error);
    return res.status(500).json({
      error: 'Failed to update settings',
      details: error instanceof Error ? error.message : 'Unknown error',
    } as ApiError);
  }
}
