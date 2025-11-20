// @ts-nocheck
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createServerClient } from '../_lib/supabase.js';
import type { GetStatisticsResponse, ApiError } from '../_lib/types.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' } as ApiError);
  }

  try {
    const supabase = createServerClient();

    // Get total articles count
    const { count: totalArticles, error: articlesError } = await supabase
      .from('articles')
      .select('*', { count: 'exact', head: true });

    if (articlesError) throw articlesError;

    // Get total episodes count
    const { count: totalEpisodes, error: episodesCountError } = await supabase
      .from('episodes')
      .select('*', { count: 'exact', head: true });

    if (episodesCountError) throw episodesCountError;

    // Get completed episodes count
    const { count: completedEpisodes, error: completedError } = await supabase
      .from('episodes')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed');

    if (completedError) throw completedError;

    // Get sum of duration and file size for completed episodes
    const { data: episodesData, error: episodesDataError } = await supabase
      .from('episodes')
      .select('duration, file_size')
      .eq('status', 'completed');

    if (episodesDataError) throw episodesDataError;

    const totalDuration = episodesData?.reduce((sum, ep) => sum + (ep.duration || 0), 0) || 0;
    const totalSize = episodesData?.reduce((sum, ep) => sum + (ep.file_size || 0), 0) || 0;

    const statistics: GetStatisticsResponse = {
      total_articles: totalArticles || 0,
      total_episodes: totalEpisodes || 0,
      completed_episodes: completedEpisodes || 0,
      total_duration: totalDuration,
      total_size: totalSize,
    };

    return res.status(200).json(statistics);
  } catch (error) {
    console.error('Error fetching statistics:', error);
    return res.status(500).json({
      error: 'Failed to fetch statistics',
      details: error instanceof Error ? error.message : 'Unknown error',
    } as ApiError);
  }
}
