"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import { favoritesApi } from "@/lib/api";
import { LoopCard } from "@/components/loops/loop-card";
import { Button } from "@/components/ui/button";
import { Loader2, Heart } from "lucide-react";

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

export default function FavoritesPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [favorites, setFavorites] = useState<Loop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/");
      return;
    }
    loadFavorites();
  }, [isAuthenticated, router]);

  const loadFavorites = async () => {
    try {
      const response = await favoritesApi.getAll();
      const loopsData = response.data.data || response.data;
      const validLoops = Array.isArray(loopsData) 
        ? loopsData.filter((loop: any) => loop && loop.id)
        : [];
      setFavorites(validLoops);
    } catch (error) {
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Heart className="h-8 w-8 text-red-500" />
          My Favorites
        </h1>
        <p className="text-muted-foreground mt-2">
          Loops you've saved for later
        </p>
      </div>

      {favorites.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-lg border">
          <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No favorites yet</h3>
          <p className="text-muted-foreground mb-4">
            Start exploring and save loops you love!
          </p>
          <Link href="/browse">
            <Button>Browse Loops</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {favorites.map((loop) => (
            <LoopCard key={loop.id} loop={loop} />
          ))}
        </div>
      )}
    </div>
  );
}
