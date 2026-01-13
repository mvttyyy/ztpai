"use client";

import { useEffect, useState } from "react";
import { trendingApi } from "@/lib/api";
import { Loader2, Flame } from "lucide-react";
import { LoopCard } from "@/components/loops/loop-card";

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
}

export default function TrendingPage() {
  const [loops, setLoops] = useState<Loop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    trendingApi
      .getTrending()
      .then((res) => setLoops(res.data))
      .catch(() => setError("Failed to load trending loops"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Flame className="h-8 w-8 text-orange-500" />
          Trending Loops
        </h1>
        <p className="text-muted-foreground mt-2">
          The most popular and trending loops right now
        </p>
      </div>
      {loading ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="text-destructive text-center">{error}</div>
      ) : loops.length === 0 ? (
        <div className="text-center text-muted-foreground">No trending loops found.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {loops.map((loop) => (
            <LoopCard key={loop.id} loop={loop} />
          ))}
        </div>
      )}
    </div>
  );
}
