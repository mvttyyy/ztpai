'use client';

import { useEffect, useState } from 'react';
import { trendingApi } from '@/lib/api';
import { LoopCard } from '@/components/loops/loop-card';
import { Loader2 } from 'lucide-react';

interface Loop {
  id: string;
  slug: string;
  title: string;
  bpm: number;
  key?: string;
  duration: number;
  genre?: string;
  previewFile?: string;
  downloadCount: number;
  listenCount: number;
  averageRating: number;
  waveformData?: number[];
  user: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
  tags: { id: string; name: string }[];
  trendingScore?: number;
}

export function TrendingLoops() {
  const [loops, setLoops] = useState<Loop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTrending();
  }, []);

  const loadTrending = async () => {
    try {
      const response = await trendingApi.getTrending(8);
      setLoops(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load trending loops');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {error}
      </div>
    );
  }

  if (loops.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No trending loops yet. Be the first to upload!
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {loops.map((loop) => (
        <LoopCard key={loop.id} loop={loop} />
      ))}
    </div>
  );
}
