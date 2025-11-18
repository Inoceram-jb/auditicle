import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createServerClient } from '../../src/lib/supabase.js';
import type { ListArticlesResponse, ApiError, ArticleWithEpisode } from '../../src/types/index.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' } as ApiError);
  }

  try {
    const supabase = createServerClient();

    // Fetch articles with their episodes
    const { data: articles, error: articlesError } = await supabase
      .from('articles')
      .select('*')
      .order('created_at', { ascending: false });

    if (articlesError) {
      throw articlesError;
    }

    // Fetch all episodes
    const { data: episodes, error: episodesError } = await supabase
      .from('episodes')
      .select('*');

    if (episodesError) {
      throw episodesError;
    }

    // Combine articles with their episodes
    const articlesWithEpisodes: ArticleWithEpisode[] = articles.map(article => {
      const episode = episodes.find(ep => ep.article_id === article.id);
      return {
        ...article,
        episode: episode || undefined,
      };
    });

    return res.status(200).json({
      articles: articlesWithEpisodes,
    } as ListArticlesResponse);
  } catch (error) {
    console.error('Error listing articles:', error);
    return res.status(500).json({
      error: 'Failed to list articles',
      details: error instanceof Error ? error.message : 'Unknown error',
    } as ApiError);
  }
}
