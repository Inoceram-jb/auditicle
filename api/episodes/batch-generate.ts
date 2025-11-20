// @ts-nocheck
import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { BatchGenerateRequest, ApiError } from '../_lib/types.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' } as ApiError);
  }

  try {
    const { articleIds }: BatchGenerateRequest = req.body;

    if (!articleIds || !Array.isArray(articleIds) || articleIds.length === 0) {
      return res.status(400).json({ error: 'Article IDs array is required' } as ApiError);
    }

    // Limit concurrent generations to avoid overload
    const MAX_CONCURRENT = 3;
    const results: Array<{ articleId: string; success: boolean; error?: string }> = [];

    // Process in batches
    for (let i = 0; i < articleIds.length; i += MAX_CONCURRENT) {
      const batch = articleIds.slice(i, i + MAX_CONCURRENT);

      const promises = batch.map(async (articleId) => {
        try {
          // Call the generate endpoint for each article
          const response = await fetch(`${process.env.VITE_APP_URL || 'http://localhost:3000'}/api/episodes/generate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ articleId }),
          });

          if (!response.ok) {
            const error = await response.json();
            return {
              articleId,
              success: false,
              error: error.error || 'Unknown error',
            };
          }

          return {
            articleId,
            success: true,
          };
        } catch (error) {
          return {
            articleId,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      });

      const batchResults = await Promise.all(promises);
      results.push(...batchResults);
    }

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    return res.status(200).json({
      total: articleIds.length,
      success: successCount,
      failed: failedCount,
      results,
    });
  } catch (error) {
    console.error('Error in batch generation:', error);
    return res.status(500).json({
      error: 'Failed to batch generate episodes',
      details: error instanceof Error ? error.message : 'Unknown error',
    } as ApiError);
  }
}
