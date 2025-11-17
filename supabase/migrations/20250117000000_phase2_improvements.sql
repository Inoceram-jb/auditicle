-- Phase 2 Improvements Migration

-- Create article source type enum
CREATE TYPE article_source AS ENUM ('url', 'text');

-- Add new columns to articles table
ALTER TABLE articles
    ADD COLUMN source_type article_source NOT NULL DEFAULT 'url',
    ADD COLUMN is_editable BOOLEAN NOT NULL DEFAULT false;

-- Make URL nullable to support text-only articles
ALTER TABLE articles ALTER COLUMN url DROP NOT NULL;
ALTER TABLE articles ALTER COLUMN url DROP DEFAULT;

-- Update the unique constraint on URL to handle nulls
-- Drop existing unique constraint
ALTER TABLE articles DROP CONSTRAINT IF EXISTS articles_url_key;

-- Add partial unique index that only applies to non-null URLs
CREATE UNIQUE INDEX articles_url_unique ON articles(url) WHERE url IS NOT NULL;

-- Update existing articles to have source_type = 'url'
UPDATE articles SET source_type = 'url' WHERE url IS NOT NULL;

-- Add comment for clarity
COMMENT ON COLUMN articles.source_type IS 'Source of the article content: url (extracted from web) or text (manually pasted)';
COMMENT ON COLUMN articles.is_editable IS 'Whether the article content can be edited by the user';
