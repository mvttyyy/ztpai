'use client';

import { useEffect, useState, useCallback, memo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { loopsApi, ratingsApi, commentsApi, favoritesApi, downloadsApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { AudioPlayer } from '@/components/audio/audio-player';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import {
  Loader2,
  Download,
  Heart,
  Star,
  Play,
  Calendar,
  Music,
  Share2,
  Flag,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Loop {
  id: string;
  slug: string;
  title: string;
  description?: string;
  bpm: number;
  key?: string;
  duration: number;
  genre?: string;
  originalFile: string;
  previewFile?: string;
  downloadCount: number;
  listenCount: number;
  averageRating: number;
  waveformData?: number[];
  fileHash: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
  tags: { id: string; name: string }[];
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
}

// Memoized Rating Section to prevent re-renders during audio playback
const RatingSection = memo(function RatingSection({
  userRating,
  onRate,
}: {
  userRating: number | null;
  onRate: (value: number) => void;
}) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  return (
    <div className="bg-card rounded-xl border p-6 mb-6">
      <h2 className="font-semibold mb-4">Rate this loop</h2>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            className="p-1 transition-transform hover:scale-110"
            onMouseEnter={() => setHoverRating(value)}
            onMouseLeave={() => setHoverRating(null)}
            onClick={() => onRate(value)}
          >
            <Star
              className={cn(
                'h-8 w-8 transition-colors',
                (hoverRating || userRating || 0) >= value
                  ? 'text-yellow-500 fill-yellow-500'
                  : 'text-muted-foreground'
              )}
            />
          </button>
        ))}
        {userRating && (
          <span className="ml-4 text-sm text-muted-foreground">
            You rated {userRating}/5
          </span>
        )}
      </div>
    </div>
  );
});

export default function LoopDetailPage() {
  const params = useParams();
  const router = useRouter();
  const loopId = params.id as string;
  const { isAuthenticated, user } = useAuthStore();
  const { toast } = useToast();

  const [loop, setLoop] = useState<Loop | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [userRating, setUserRating] = useState<number | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    loadLoop();
    loadComments();
  }, [loopId]);

  const loadLoop = async () => {
    try {
      const response = await loopsApi.getById(loopId);
      setLoop(response.data);

      // Check if user has rated/favorited
      if (isAuthenticated) {
        try {
          const ratingRes = await ratingsApi.getUserRating(loopId);
          if (ratingRes.data && ratingRes.data.value) {
            setUserRating(ratingRes.data.value);
          }
        } catch (e) {
          // No rating exists, that's fine
          console.log('No existing rating');
        }

        try {
          const favRes = await favoritesApi.check(loopId);
          setIsFavorite(favRes.data.isFavorite || favRes.data.isFavorited || false);
        } catch {}
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load loop');
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      const response = await commentsApi.getForLoop(loopId);
      // Backend returns { data: comments, meta: {...} } so extract .data
      const commentsData = response.data.data || response.data;
      setComments(commentsData);
    } catch (err) {
      console.error('Failed to load comments:', err);
    }
  };

  const handleRate = useCallback(async (value: number) => {
    if (!isAuthenticated) {
      toast({
        title: 'Login required',
        description: 'Please log in to rate loops',
        variant: 'destructive',
      });
      return;
    }

    // Optimistically update user rating
    const previousRating = userRating;
    setUserRating(value);

    try {
      await ratingsApi.rate(loopId, value);
      // Update average rating locally without full reload
      if (loop) {
        const response = await loopsApi.getById(loopId);
        setLoop(prev => prev ? { ...prev, averageRating: response.data.averageRating } : prev);
      }
      toast({ title: 'Rating saved!' });
    } catch (error: any) {
      // Revert on error
      setUserRating(previousRating);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save rating',
        variant: 'destructive',
      });
    }
  }, [isAuthenticated, loopId, loop, userRating, toast]);

  const handleFavorite = async () => {
    if (!isAuthenticated) {
      toast({
        title: 'Login required',
        description: 'Please log in to add favorites',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (isFavorite) {
        await favoritesApi.remove(loopId);
        setIsFavorite(false);
        toast({ title: 'Removed from favorites' });
      } else {
        await favoritesApi.add(loopId);
        setIsFavorite(true);
        toast({ title: 'Added to favorites' });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update favorites',
        variant: 'destructive',
      });
    }
  };

  const handleDownload = async () => {
    if (!isAuthenticated) {
      toast({
        title: 'Login required',
        description: 'Please log in to download loops',
        variant: 'destructive',
      });
      return;
    }

    setDownloading(true);
    try {
      const response = await downloadsApi.download(loopId);
      const { fileUrl, fileName, certificate } = response.data;
      
      // Fetch the file as blob to force download instead of opening in browser
      const fileResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/uploads/${fileUrl}`
      );
      const blob = await fileResponse.blob();
      
      // Create object URL and trigger download
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName || 'loop.mp3';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the blob URL
      window.URL.revokeObjectURL(blobUrl);

      toast({
        title: 'Download started!',
        description: `Certificate: ${certificate.certificateHash.slice(0, 16)}...`,
      });

      loadLoop(); // Refresh download count
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message || 'Please try again';
      toast({
        title: 'Download failed',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setDownloading(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    if (!isAuthenticated) {
      toast({
        title: 'Login required',
        description: 'Please log in to comment',
        variant: 'destructive',
      });
      return;
    }

    setSubmittingComment(true);
    try {
      await commentsApi.create(loopId, newComment);
      setNewComment('');
      loadComments();
      toast({ title: 'Comment posted!' });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to post comment',
        variant: 'destructive',
      });
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: 'Link copied to clipboard!' });
  };

  const handlePlay = async () => {
    try {
      await loopsApi.recordListen(loopId);
    } catch {}
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !loop) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold mb-2">Loop not found</h1>
        <p className="text-muted-foreground mb-6">{error}</p>
        <Link href="/browse">
          <Button>Browse Loops</Button>
        </Link>
      </div>
    );
  }

  const previewUrl = loop.previewFile
    ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/uploads/${loop.previewFile}`
    : null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="bg-card rounded-xl border p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Waveform/Player */}
          <div className="flex-1">
            {previewUrl ? (
              <AudioPlayer
                src={previewUrl}
                waveformData={loop.waveformData}
                onPlay={handlePlay}
              />
            ) : (
              <div className="h-32 bg-muted rounded-lg flex items-center justify-center">
                <Music className="h-12 w-12 text-muted-foreground" />
              </div>
            )}
          </div>
        </div>

        {/* Title & Info */}
        <div className="mt-6">
          <h1 className="text-2xl font-bold mb-2">{loop.title}</h1>
          
          <Link
            href={`/profile/${loop.user.username}`}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Avatar className="h-6 w-6">
              <AvatarImage src={loop.user.avatarUrl} />
              <AvatarFallback className="text-xs">
                {loop.user.username[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span>{loop.user.username}</span>
          </Link>

          {loop.description && (
            <p className="text-muted-foreground mt-4">{loop.description}</p>
          )}

          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-4 mt-4 text-sm">
            <span className="font-semibold">{loop.bpm} BPM</span>
            {loop.key && <span>{loop.key}</span>}
            {loop.genre && <Badge variant="secondary">{loop.genre}</Badge>}
            <span className="text-muted-foreground flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {new Date(loop.createdAt).toLocaleDateString()}
            </span>
          </div>

          {/* Tags */}
          {loop.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {loop.tags.map((tag) => (
                <Link key={tag.id} href={`/browse?tag=${tag.name}`}>
                  <Badge variant="outline" className="cursor-pointer hover:bg-primary hover:text-primary-foreground">
                    #{tag.name}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Stats & Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-6 pt-6 border-t">
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Download className="h-4 w-4" />
              {loop.downloadCount} downloads
            </div>
            <div className="flex items-center gap-1">
              <Play className="h-4 w-4" />
              {loop.listenCount} plays
            </div>
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-yellow-500" />
              {loop.averageRating.toFixed(1)} rating
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleShare}>
              <Share2 className="h-4 w-4" />
            </Button>
            <Button
              variant={isFavorite ? 'default' : 'outline'}
              size="icon"
              onClick={handleFavorite}
            >
              <Heart className={cn('h-4 w-4', isFavorite && 'fill-current')} />
            </Button>
            <Button onClick={handleDownload} disabled={downloading}>
              {downloading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Download
            </Button>
          </div>
        </div>
      </div>

      {/* Rating Section */}
      <RatingSection userRating={userRating} onRate={handleRate} />

      {/* Comments Section */}
      <div className="bg-card rounded-xl border p-6">
        <h2 className="font-semibold mb-4">Comments ({comments.length})</h2>

        {/* New Comment Form */}
        {isAuthenticated ? (
          <form onSubmit={handleSubmitComment} className="mb-6">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Leave a comment..."
              rows={3}
              className="mb-2"
            />
            <Button type="submit" disabled={submittingComment || !newComment.trim()}>
              {submittingComment && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Post Comment
            </Button>
          </form>
        ) : (
          <p className="text-muted-foreground mb-6">
            <Link href="/" className="text-primary hover:underline">
              Log in
            </Link>{' '}
            to leave a comment.
          </p>
        )}

        {/* Comments List */}
        {comments.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No comments yet. Be the first to comment!
          </p>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <Link href={`/profile/${comment.user.username}`}>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={comment.user.avatarUrl} />
                    <AvatarFallback className="text-xs">
                      {comment.user.username[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/profile/${comment.user.username}`}
                      className="font-medium hover:text-primary"
                    >
                      {comment.user.username}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {new Date(comment.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm mt-1">{comment.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
