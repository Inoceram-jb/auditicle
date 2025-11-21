import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

export interface ExtractedContent {
  title: string;
  content: string;
  author: string | null;
  excerpt: string;
}

export async function extractArticleContent(url: string): Promise<ExtractedContent> {
  try {
    // Fetch the HTML
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch article: ${response.statusText}`);
    }

    const html = await response.text();

    // Parse with JSDOM
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article) {
      throw new Error('Failed to parse article content');
    }

    // Clean the content
    const cleanedContent = cleanTextForTTS(article.textContent || '');

    return {
      title: article.title || 'Untitled Article',
      content: cleanedContent,
      author: article.byline || null,
      excerpt: article.excerpt || '',
    };
  } catch (error) {
    throw new Error(`Content extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function cleanTextForTTS(text: string): string {
  let cleaned = text;

  // Remove multiple spaces
  cleaned = cleaned.replace(/\s+/g, ' ');

  // Remove HTML tags if any remain
  cleaned = cleaned.replace(/<[^>]*>/g, '');

  // Replace URLs with placeholder
  cleaned = cleaned.replace(/https?:\/\/[^\s]+/g, 'lien disponible dans la description');

  // Remove special characters that may cause TTS issues
  cleaned = cleaned.replace(/[^\w\s.,!?;:()\-'"àâäéèêëïîôùûüÿçÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ]/g, '');

  // Ensure proper punctuation for better prosody
  cleaned = cleaned.replace(/([.!?])\s*([A-ZÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ])/g, '$1 $2');

  // Add pause between paragraphs (represented by double newlines)
  cleaned = cleaned.replace(/\n\n+/g, '. ');

  // Trim and normalize
  cleaned = cleaned.trim();

  return cleaned;
}

export function splitTextIntoChunks(text: string, maxChunkBytes: number = 4500): string[] {
  // Use bytes instead of characters (UTF-8 chars can be 2-3 bytes)
  const getByteLength = (str: string) => new TextEncoder().encode(str).length;

  if (getByteLength(text) <= maxChunkBytes) {
    return [text];
  }

  const chunks: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);

  let currentChunk = '';

  for (const sentence of sentences) {
    const combined = currentChunk + (currentChunk ? ' ' : '') + sentence;
    if (getByteLength(combined) > maxChunkBytes) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }
      // If single sentence is too long, split by words
      if (getByteLength(sentence) > maxChunkBytes) {
        const words = sentence.split(' ');
        let wordChunk = '';
        for (const word of words) {
          const wordCombined = wordChunk + (wordChunk ? ' ' : '') + word;
          if (getByteLength(wordCombined) > maxChunkBytes) {
            if (wordChunk) chunks.push(wordChunk.trim());
            wordChunk = word;
          } else {
            wordChunk = wordCombined;
          }
        }
        currentChunk = wordChunk;
      } else {
        currentChunk = sentence;
      }
    } else {
      currentChunk = combined;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

export function validateUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}
