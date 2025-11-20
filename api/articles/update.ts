import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createServerClient } from '../_lib/supabase.js';
import type { UpdateArticleRequest, ApiError } from '../_lib/types.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' } as ApiError);
  }

  try {
    const { articleId, title, content, author }: UpdateArticleRequest = req.body;

    if (!articleId) {
      return res.status(400).json({ error: 'Article ID is required' } as ApiError);
    }

    const supabase = createServerClient();

    // Check if article exists and is editable
    const { data: article, error: fetchError } = await supabase
      .from('articles')
      .select('id, is_editable')
      .eq('id', articleId)
      .single();

    if (fetchError || !article) {
      return res.status(404).json({ error: 'Article not found' } as ApiError);
    }

    if (!article.is_editable) {
      return res.status(403).json({
        error: 'Article is not editable',
        details: 'Only text-based articles can be edited'
      } as ApiError);
    }

    // Prepare update object
    const updates: any = {};
    if (title !== undefined && title.trim()) updates.title = title.trim();
    if (content !== undefined && content.trim()) {
      // Check character limit
      if (content.length > 50000) {
        return res.status(400).json({
          error: 'Article too long',
          details: 'Maximum 50,000 characters allowed',
        } as ApiError);
      }
      updates.content = content.trim();
    }
    if (author !== undefined) updates.author = author?.trim() || null;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No updates provided' } as ApiError);
    }

    // Update article
    const { error: updateError } = await supabase
      .from('articles')
      .update(updates)
      .eq('id', articleId);

    if (updateError) {
      throw updateError;
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error updating article:', error);
    return res.status(500).json({
      error: 'Failed to update article',
      details: error instanceof Error ? error.message : 'Unknown error',
    } as ApiError);
  }
}
