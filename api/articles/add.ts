import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createServerClient } from '../../src/lib/supabase';
import { extractArticleContent, validateUrl } from '../../src/utils/content-extraction';
import type { AddArticleRequest, AddArticleResponse, ApiError } from '../../src/types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' } as ApiError);
  }

  try {
    const { url }: AddArticleRequest = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL is required' } as ApiError);
    }

    if (!validateUrl(url)) {
      return res.status(400).json({ error: 'Invalid URL format' } as ApiError);
    }

    // Check if article already exists
    const supabase = createServerClient();
    const { data: existingArticle } = await supabase
      .from('articles')
      .select('id, title')
      .eq('url', url)
      .single();

    if (existingArticle) {
      return res.status(200).json({
        articleId: existingArticle.id,
        title: existingArticle.title,
      } as AddArticleResponse);
    }

    // Extract content
    const extracted = await extractArticleContent(url);

    // Check character limit
    if (extracted.content.length > 50000) {
      return res.status(400).json({
        error: 'Article too long',
        details: 'Maximum 50,000 characters allowed',
      } as ApiError);
    }

    // Insert article into database
    const { data: article, error } = await supabase
      .from('articles')
      .insert({
        url,
        title: extracted.title,
        content: extracted.content,
        author: extracted.author,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Create pending episode
    await supabase.from('episodes').insert({
      article_id: article.id,
      audio_url: '',
      status: 'pending',
      tts_provider: 'google',
    });

    return res.status(201).json({
      articleId: article.id,
      title: article.title,
    } as AddArticleResponse);
  } catch (error) {
    console.error('Error adding article:', error);
    return res.status(500).json({
      error: 'Failed to add article',
      details: error instanceof Error ? error.message : 'Unknown error',
    } as ApiError);
  }
}
