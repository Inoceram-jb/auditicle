import { useState } from 'react';
import { LoadingSpinner } from './LoadingSpinner';
import { useToastStore } from '@/store/toast';

interface AddTextArticleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddTextArticleModal({ isOpen, onClose, onSuccess }: AddTextArticleModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [author, setAuthor] = useState('');
  const [adding, setAdding] = useState(false);
  const { addToast } = useToastStore();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setAdding(true);
    try {
      const response = await fetch('/api/articles/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          author: author.trim() || undefined,
          source_type: 'text',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add article');
      }

      addToast({
        type: 'success',
        message: 'Article added successfully',
      });

      // Reset form
      setTitle('');
      setContent('');
      setAuthor('');
      onSuccess();
      onClose();
    } catch (error) {
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to add article',
      });
    } finally {
      setAdding(false);
    }
  };

  const handleClose = () => {
    if (!adding) {
      setTitle('');
      setContent('');
      setAuthor('');
      onClose();
    }
  };

  const characterCount = content.length;
  const characterLimit = 50000;
  const isOverLimit = characterCount > characterLimit;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Add Text Article</h2>
          <p className="text-gray-600 mt-1">Paste your article content directly</p>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Enter article title"
              required
              disabled={adding}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Author (optional)
            </label>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Enter author name"
              disabled={adding}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">
                Content <span className="text-red-500">*</span>
              </label>
              <span className={`text-sm ${isOverLimit ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                {characterCount.toLocaleString()} / {characterLimit.toLocaleString()} characters
              </span>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent min-h-[300px] font-mono text-sm ${
                isOverLimit ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Paste your article content here..."
              required
              disabled={adding}
            />
            {isOverLimit && (
              <p className="text-sm text-red-600 mt-1">
                Content exceeds maximum length. Please reduce by {(characterCount - characterLimit).toLocaleString()} characters.
              </p>
            )}
          </div>
        </form>

        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={adding}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={adding || !title.trim() || !content.trim() || isOverLimit}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
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
        </div>
      </div>
    </div>
  );
}
