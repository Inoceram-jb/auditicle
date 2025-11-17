import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArticleCard } from '@/components/ArticleCard';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useToastStore } from '@/store/toast';
import type { ArticleWithEpisode, ListArticlesResponse } from '@/types';

export function Dashboard() {
  const [articles, setArticles] = useState<ArticleWithEpisode[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [url, setUrl] = useState('');
  const { addToast } = useToastStore();

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      const response = await fetch('/api/articles/list');
      if (!response.ok) throw new Error('Failed to fetch articles');

      const data: ListArticlesResponse = await response.json();
      setArticles(data.articles);
    } catch (error) {
      addToast({
        type: 'error',
        message: 'Failed to load articles',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setAdding(true);
    try {
      const response = await fetch('/api/articles/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add article');
      }

      addToast({
        type: 'success',
        message: 'Article added successfully',
      });

      setUrl('');
      await fetchArticles();
    } catch (error) {
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to add article',
      });
    } finally {
      setAdding(false);
    }
  };

  const handleGenerateEpisode = async (articleId: string) => {
    try {
      const response = await fetch('/api/episodes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate episode');
      }

      addToast({
        type: 'success',
        message: 'Episode generation started',
      });

      await fetchArticles();
    } catch (error) {
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to generate episode',
      });
    }
  };

  const handleDeleteArticle = async (articleId: string) => {
    try {
      const response = await fetch('/api/articles/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId }),
      });

      if (!response.ok) throw new Error('Failed to delete article');

      addToast({
        type: 'success',
        message: 'Article deleted successfully',
      });

      await fetchArticles();
    } catch (error) {
      addToast({
        type: 'error',
        message: 'Failed to delete article',
      });
    }
  };

  const handleBatchGenerate = async () => {
    const pendingArticles = articles.filter(
      (a) => a.episode && (a.episode.status === 'pending' || a.episode.status === 'failed')
    );

    if (pendingArticles.length === 0) {
      addToast({
        type: 'info',
        message: 'No pending articles to generate',
      });
      return;
    }

    try {
      const response = await fetch('/api/episodes/batch-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleIds: pendingArticles.map((a) => a.id) }),
      });

      if (!response.ok) throw new Error('Failed to start batch generation');

      addToast({
        type: 'success',
        message: `Batch generation started for ${pendingArticles.length} articles`,
      });

      await fetchArticles();
    } catch (error) {
      addToast({
        type: 'error',
        message: 'Failed to start batch generation',
      });
    }
  };

  const rssUrl = `${window.location.origin}/api/feed/rss`;

  const copyRssUrl = () => {
    navigator.clipboard.writeText(rssUrl);
    addToast({
      type: 'success',
      message: 'RSS URL copied to clipboard',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Auditicle</h1>
              <p className="text-gray-600 mt-1">Transform articles into audio episodes</p>
            </div>
            <Link
              to="/settings"
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Settings
            </Link>
          </div>
        </header>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Article</h2>
          <form onSubmit={handleAddArticle} className="flex gap-3">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste article URL here..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
            <button
              type="submit"
              disabled={adding}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors flex items-center gap-2"
            >
              {adding ? (
                <>
                  <LoadingSpinner size="sm" />
                  Adding...
                </>
              ) : (
                'Add Article'
              )}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">RSS Feed</h2>
          <div className="flex gap-3 items-center">
            <input
              type="text"
              value={rssUrl}
              readOnly
              className="flex-1 px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm font-mono"
            />
            <button
              onClick={copyRssUrl}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Copy URL
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Use this URL to subscribe to your podcast in any podcast app
          </p>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">
            Articles ({articles.length})
          </h2>
          {articles.some((a) => a.episode && (a.episode.status === 'pending' || a.episode.status === 'failed')) && (
            <button
              onClick={handleBatchGenerate}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
            >
              Generate All Pending
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center items-center p-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : articles.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center border border-gray-200">
            <p className="text-gray-500 text-lg">No articles yet. Add your first article above!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {articles.map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                onGenerate={handleGenerateEpisode}
                onDelete={handleDeleteArticle}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
