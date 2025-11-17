import { useState } from 'react';
import { format } from 'date-fns';
import { AudioPlayer } from './AudioPlayer';
import { LoadingSpinner } from './LoadingSpinner';
import type { ArticleWithEpisode } from '@/types';

interface ArticleCardProps {
  article: ArticleWithEpisode;
  onGenerate: (articleId: string) => Promise<void>;
  onDelete: (articleId: string) => Promise<void>;
  onPreview: (article: ArticleWithEpisode) => void;
}

export function ArticleCard({ article, onGenerate, onDelete, onPreview }: ArticleCardProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await onGenerate(article.id);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this article?')) {
      return;
    }
    setIsDeleting(true);
    try {
      await onDelete(article.id);
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusBadge = () => {
    if (!article.episode) {
      return <span className="px-2 py-1 text-xs font-semibold bg-gray-200 text-gray-700 rounded">No Episode</span>;
    }

    const statusColors = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded ${statusColors[article.episode.status]}`}>
        {article.episode.status.charAt(0).toUpperCase() + article.episode.status.slice(1)}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{article.title}</h3>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            {article.author && <span>By {article.author}</span>}
            <span>•</span>
            <span>{format(new Date(article.created_at), 'MMM dd, yyyy')}</span>
          </div>
        </div>
        {getStatusBadge()}
      </div>

      <div className="flex items-center gap-3 mb-4">
        {article.url && (
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary-600 hover:text-primary-700 hover:underline"
          >
            View original article →
          </a>
        )}
        {article.source_type === 'text' && (
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-semibold">
            Text Article
          </span>
        )}
      </div>

      {article.episode?.status === 'completed' && article.episode.audio_url && (
        <div className="mb-4">
          <AudioPlayer audioUrl={article.episode.audio_url} title={article.title} />
          <div className="text-xs text-gray-500 mt-2">
            Duration: {Math.floor(article.episode.duration / 60)}:{(article.episode.duration % 60).toString().padStart(2, '0')} •
            Size: {(article.episode.file_size / 1024 / 1024).toFixed(2)} MB
          </div>
        </div>
      )}

      {article.episode?.status === 'failed' && article.episode.error_message && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          Error: {article.episode.error_message}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {(!article.episode || article.episode.status === 'pending' || article.episode.status === 'failed') && (
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium transition-colors"
          >
            {isGenerating ? (
              <>
                <LoadingSpinner size="sm" />
                Generating...
              </>
            ) : (
              'Generate Audio'
            )}
          </button>
        )}

        {article.episode?.status === 'processing' && (
          <div className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg flex items-center gap-2 text-sm font-medium">
            <LoadingSpinner size="sm" />
            Processing...
          </div>
        )}

        <button
          onClick={() => onPreview(article)}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm font-medium transition-colors"
        >
          {article.is_editable ? 'Edit' : 'Preview'}
        </button>

        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium transition-colors"
        >
          {isDeleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </div>
  );
}
