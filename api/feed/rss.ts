// @ts-nocheck
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createServerClient } from '../_lib/supabase.js';
import { format } from 'date-fns';

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createServerClient();

    // Get settings
    const { data: settings, error: settingsError } = await supabase
      .from('settings')
      .select('*')
      .eq('user_id', 'default-user')
      .single();

    if (settingsError || !settings) {
      throw new Error('Settings not found');
    }

    // Get completed episodes with their articles
    const { data: episodes, error: episodesError } = await supabase
      .from('episodes')
      .select('*, articles(*)')
      .eq('status', 'completed')
      .order('completed_at', { ascending: false });

    if (episodesError) {
      throw episodesError;
    }

    const appUrl = process.env.VITE_APP_URL || 'http://localhost:3000';

    // Build RSS XML
    let rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(settings.podcast_title)}</title>
    <link>${escapeXml(appUrl)}</link>
    <description>${escapeXml(settings.podcast_description)}</description>
    <language>fr-FR</language>
    <itunes:author>${escapeXml(settings.podcast_author)}</itunes:author>
    <itunes:summary>${escapeXml(settings.podcast_description)}</itunes:summary>
    <itunes:owner>
      <itunes:name>${escapeXml(settings.podcast_author)}</itunes:name>
    </itunes:owner>`;

    if (settings.podcast_cover_url) {
      rss += `
    <itunes:image href="${escapeXml(settings.podcast_cover_url)}" />
    <image>
      <url>${escapeXml(settings.podcast_cover_url)}</url>
      <title>${escapeXml(settings.podcast_title)}</title>
      <link>${escapeXml(appUrl)}</link>
    </image>`;
    }

    rss += `
    <itunes:category text="Technology" />
    <itunes:explicit>false</itunes:explicit>`;

    // Add episodes
    for (const episode of episodes || []) {
      const article = episode.articles;
      if (!article) continue;

      const pubDate = episode.completed_at
        ? format(new Date(episode.completed_at), 'EEE, dd MMM yyyy HH:mm:ss xx')
        : format(new Date(), 'EEE, dd MMM yyyy HH:mm:ss xx');

      rss += `
    <item>
      <title>${escapeXml(article.title)}</title>
      <link>${escapeXml(article.url)}</link>
      <guid isPermaLink="false">${episode.id}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(`Article: ${article.title}${article.author ? ` par ${article.author}` : ''}`)}</description>
      <enclosure url="${escapeXml(episode.audio_url)}" length="${episode.file_size}" type="audio/mpeg" />
      <itunes:duration>${formatDuration(episode.duration)}</itunes:duration>
      <itunes:explicit>false</itunes:explicit>
      <itunes:author>${escapeXml(article.author || settings.podcast_author)}</itunes:author>
    </item>`;
    }

    rss += `
  </channel>
</rss>`;

    res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    return res.status(200).send(rss);
  } catch (error) {
    console.error('Error generating RSS feed:', error);
    return res.status(500).json({
      error: 'Failed to generate RSS feed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
