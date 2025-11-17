import { useState, useEffect } from 'react';
import { LoadingSpinner } from './LoadingSpinner';
import type { GetStatisticsResponse } from '@/types';

export function StatisticsCard() {
  const [stats, setStats] = useState<GetStatisticsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      const response = await fetch('/api/statistics/get');
      if (!response.ok) throw new Error('Failed to fetch statistics');

      const data: GetStatisticsResponse = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatSize = (bytes: number): string => {
    const mb = bytes / 1024 / 1024;
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(2)} GB`;
    }
    return `${mb.toFixed(2)} MB`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 flex justify-center">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (!stats) return null;

  const completionRate = stats.total_episodes > 0
    ? Math.round((stats.completed_episodes / stats.total_episodes) * 100)
    : 0;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Statistics</h2>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-primary-600">{stats.total_articles}</div>
          <div className="text-xs text-gray-600 mt-1">Total Articles</div>
        </div>

        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-primary-600">{stats.total_episodes}</div>
          <div className="text-xs text-gray-600 mt-1">Total Episodes</div>
        </div>

        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{stats.completed_episodes}</div>
          <div className="text-xs text-gray-600 mt-1">Completed</div>
        </div>

        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{formatDuration(stats.total_duration)}</div>
          <div className="text-xs text-gray-600 mt-1">Total Duration</div>
        </div>

        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">{formatSize(stats.total_size)}</div>
          <div className="text-xs text-gray-600 mt-1">Storage Used</div>
        </div>
      </div>

      {stats.total_episodes > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600">Completion Rate</span>
            <span className="font-semibold text-gray-900">{completionRate}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
