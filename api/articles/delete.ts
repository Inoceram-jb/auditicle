// @ts-nocheck
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createServerClient } from '../_lib/supabase.js';
import { deleteAudioFromR2, getFileNameFromUrl } from '../../src/lib/r2.js';
import type { DeleteArticleRequest, ApiError } from '../_lib/types.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' } as ApiError);
  }

  try {
    const { articleId }: DeleteArticleRequest = req.body;

    if (!articleId || typeof articleId !== 'string') {
      return res.status(400).json({ error: 'Article ID is required' } as ApiError);
    }

    const supabase = createServerClient();

    // Get episode to find audio URL
    const { data: episode } = await supabase
      .from('episodes')
      .select('audio_url')
      .eq('article_id', articleId)
      .single();

    // Delete audio file from R2 if it exists
    if (episode?.audio_url) {
      try {
        const fileName = getFileNameFromUrl(episode.audio_url);
        await deleteAudioFromR2(fileName);
      } catch (error) {
        console.error('Error deleting audio from R2:', error);
        // Continue with deletion even if R2 deletion fails
      }
    }

    // Delete article (cascade will delete episode)
    const { error: deleteError } = await supabase
      .from('articles')
      .delete()
      .eq('id', articleId);

    if (deleteError) {
      throw deleteError;
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error deleting article:', error);
    return res.status(500).json({
      error: 'Failed to delete article',
      details: error instanceof Error ? error.message : 'Unknown error',
    } as ApiError);
  }
}
