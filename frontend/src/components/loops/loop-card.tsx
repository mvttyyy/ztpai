'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Play, Download, Heart, Star, Music, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AudioPlayer } from '@/components/audio/audio-player';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { useAudioStore } from '@/stores/audio-store';
import { favoritesApi, loopsApi } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';

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
  isFavorite?: boolean;
}

interface LoopCardProps {
  loop: Loop;
  variant?: 'default' | 'compact' | 'full';
  onFavoriteChange?: (isFavorite: boolean) => void;
}

export function LoopCard({ loop, variant = 'default', onFavoriteChange }: LoopCardProps) {
  const [isFavorite, setIsFavorite] = useState(loop.isFavorite || false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const { isAuthenticated } = useAuthStore();
  const { mixLoops, addToMix, canAddToMix } = useAudioStore();
  const { toast } = useToast();

  const previewUrl = loop.previewFile 
    ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/uploads/${loop.previewFile}`
    : null;

  const isInMix = mixLoops.some(l => l.id === loop.id);
  const canAdd = canAddToMix(loop.bpm);

  const handleAddToMix = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!previewUrl) {
      toast({
        title: 'Cannot add to mix',
        description: 'This loop has no preview available',
        variant: 'destructive',
      });
      return;
    }

    if (isInMix) {
      toast({
        title: 'Already in mix',
        description: 'This loop is already in your mix',
      });
      return;
    }

    if (!canAdd) {
      const currentBpm = mixLoops.length > 0 ? mixLoops[0].bpm : null;
      if (currentBpm && currentBpm !== loop.bpm) {
        toast({
          title: 'BPM mismatch',
          description: `Mix has ${currentBpm} BPM loops. Remove them first or choose a loop with matching BPM.`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Mix is full',
          description: 'Maximum 4 loops can be mixed together',
          variant: 'destructive',
        });
      }
      return;
    }

    const success = addToMix({
      id: loop.id,
      slug: loop.slug,
      title: loop.title,
      bpm: loop.bpm,
      previewUrl,
      waveformData: loop.waveformData,
      user: { username: loop.user.username },
    });

    if (success) {
      toast({
        title: 'Added to mix',
        description: `"${loop.title}" added to your mix`,
      });
    }
  };

  const handleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      toast({
        title: 'Login required',
        description: 'Please log in to add favorites',
        variant: 'destructive',
      });
      return;
    }

    setFavoriteLoading(true);
    try {
      if (isFavorite) {
        await favoritesApi.remove(loop.id);
        setIsFavorite(false);
        toast({ title: 'Removed from favorites' });
      } else {
        await favoritesApi.add(loop.id);
        setIsFavorite(true);
        toast({ title: 'Added to favorites' });
      }
      onFavoriteChange?.(!isFavorite);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update favorites',
        variant: 'destructive',
      });
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handlePlay = async () => {
    try {
      await loopsApi.recordListen(loop.id);
    } catch (error) {
      // Silently fail listen tracking
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-3 p-3 bg-card rounded-lg hover:bg-accent/50 transition-colors">
        <div className="relative h-12 w-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
          <Music className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <Link href={`/loops/${loop.slug || loop.id}`} className="font-medium hover:text-primary truncate block">
            {loop.title}
          </Link>
          <p className="text-sm text-muted-foreground truncate">
            {loop.bpm} BPM {loop.key && `• ${loop.key}`}
          </p>
        </div>
        {previewUrl && (
          <AudioPlayer
            src={previewUrl}
            loopId={loop.id}
            waveformData={loop.waveformData}
            compact
            onPlay={handlePlay}
            className="w-32"
          />
        )}
      </div>
    );
  }

  return (
    <div className="group bg-card rounded-xl overflow-hidden border border-border hover:border-primary/50 transition-all duration-200 hover:shadow-lg">
      {/* Preview/Waveform Area */}
      <div className="relative h-32 bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
        {previewUrl && loop.waveformData && loop.waveformData.length > 0 ? (
          <AudioPlayer
            src={previewUrl}
            loopId={loop.id}
            waveformData={loop.waveformData}
            compact
            onPlay={handlePlay}
            className="absolute inset-x-4 bottom-4"
          />
        ) : (
          <div className="text-center">
            <Music className="h-12 w-12 text-primary/50 mx-auto mb-2" />
            {previewUrl && (
              <AudioPlayer
                src={previewUrl}
                loopId={loop.id}
                compact
                onPlay={handlePlay}
                className="absolute inset-x-4 bottom-4"
              />
            )}
          </div>
        )}
        
        {/* Favorite Button */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'absolute top-2 right-2 h-8 w-8 bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity',
            isFavorite && 'opacity-100 text-red-500'
          )}
          onClick={handleFavorite}
          disabled={favoriteLoading}
        >
          <Heart className={cn('h-4 w-4', isFavorite && 'fill-current')} />
        </Button>

        {/* Add to Mix Button */}
        {previewUrl && (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'absolute top-2 left-2 h-8 w-8 bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity',
              isInMix && 'opacity-100 text-primary bg-primary/20'
            )}
            onClick={handleAddToMix}
            disabled={isInMix}
            title={isInMix ? 'Already in mix' : canAdd ? 'Add to mix' : 'BPM mismatch'}
          >
            <Layers className={cn('h-4 w-4', isInMix && 'fill-current')} />
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <Link href={`/loops/${loop.slug || loop.id}`} className="block">
          <h3 className="font-semibold truncate hover:text-primary transition-colors">
            {loop.title}
          </h3>
        </Link>

        {/* User */}
        <Link 
          href={`/profile/${loop.user.username}`}
          className="flex items-center gap-2 mt-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Avatar className="h-5 w-5">
            <AvatarImage src={loop.user.avatarUrl} />
            <AvatarFallback className="text-xs">
              {loop.user.username[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="truncate">{loop.user.username}</span>
        </Link>

        {/* Info Row */}
        <div className="flex items-center gap-3 mt-3 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{loop.bpm} BPM</span>
          {loop.key && <span>{loop.key}</span>}
          <span>{formatDuration(loop.duration)}</span>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Download className="h-3.5 w-3.5" />
            <span>{loop.downloadCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <Play className="h-3.5 w-3.5" />
            <span>{loop.listenCount}</span>
          </div>
          {loop.averageRating > 0 && (
            <div className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
              <span>{loop.averageRating.toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* Tags */}
        {loop.tags && loop.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {loop.tags.slice(0, 3).map((tag) => (
              <Link key={tag.id} href={`/browse?tag=${tag.name}`}>
                <Badge variant="secondary" className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground">
                  {tag.name}
                </Badge>
              </Link>
            ))}
            {loop.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{loop.tags.length - 3}
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
