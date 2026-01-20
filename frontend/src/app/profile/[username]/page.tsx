'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { usersApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { LoopCard } from '@/components/loops/loop-card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Loader2,
  Music,
  Heart,
  Download,
  Play,
  Calendar,
  Settings,
} from 'lucide-react';

interface User {
  id: string;
  username: string;
  email: string;
  bio?: string;
  avatarUrl?: string;
  role: string;
  createdAt: string;
  _count?: {
    loops: number;
    favorites: number;
    downloads: number;
  };
}

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

export default function ProfilePage() {
  const params = useParams();
  const username = params.username as string;
  const { user: currentUser, isAuthenticated } = useAuthStore();

  const [user, setUser] = useState<User | null>(null);
  const [loops, setLoops] = useState<Loop[]>([]);
  const [favorites, setFavorites] = useState<Loop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('loops');

  // Check if this is the current user's own profile
  const isOwnProfile = currentUser?.username === username;

  useEffect(() => {
    loadUserData();
  }, [username]);

  const loadUserData = async () => {
    setLoading(true);
    try {
      // Get user by username
      const userRes = await usersApi.getByUsername(username);
      setUser(userRes.data);

      // Get user's loops
      const loopsRes = await usersApi.getUserLoops(username, { limit: 50 });
      setLoops(loopsRes.data.data || loopsRes.data);

      // Load favorites if viewing own profile
      if (isOwnProfile && userRes.data?.id) {
        try {
          const favRes = await usersApi.getFavorites(userRes.data.id);
          setFavorites(favRes.data.map((f: any) => f.loop));
        } catch {
          // Favorites may not be accessible
        }
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load profile';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold mb-2">User not found</h1>
        <p className="text-muted-foreground mb-6">{error}</p>
        <Link href="/">
          <Button>Go Home</Button>
        </Link>
      </div>
    );
  }

  const totalDownloads = loops.reduce((sum, loop) => sum + loop.downloadCount, 0);
  const totalPlays = loops.reduce((sum, loop) => sum + loop.listenCount, 0);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Profile Header */}
      <div className="bg-card rounded-xl border p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
          <Avatar className="h-24 w-24">
            <AvatarImage src={user.avatarUrl} />
            <AvatarFallback className="text-2xl">
              {user.username[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold">{user.username}</h1>
              {user.role === 'ADMIN' && (
                <Badge variant="default">Admin</Badge>
              )}
            </div>
            {user.bio && (
              <p className="text-muted-foreground mb-3">{user.bio}</p>
            )}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Joined {new Date(user.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>

          {isOwnProfile && (
            <Link href="/settings">
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            </Link>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold">{loops.length}</div>
            <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
              <Music className="h-4 w-4" />
              Loops
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{totalDownloads}</div>
            <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
              <Download className="h-4 w-4" />
              Downloads
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{totalPlays}</div>
            <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
              <Play className="h-4 w-4" />
              Plays
            </div>
          </div>
          {isOwnProfile && (
            <div className="text-center">
              <div className="text-2xl font-bold">{favorites.length}</div>
              <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                <Heart className="h-4 w-4" />
                Favorites
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="loops">
            <Music className="h-4 w-4 mr-2" />
            Loops ({loops.length})
          </TabsTrigger>
          {isOwnProfile && (
            <TabsTrigger value="favorites">
              <Heart className="h-4 w-4 mr-2" />
              Favorites ({favorites.length})
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="loops" className="mt-6">
          {loops.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-lg border">
              <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No loops yet</h3>
              <p className="text-muted-foreground mb-4">
                {isOwnProfile
                  ? "You haven't uploaded any loops yet."
                  : "This user hasn't uploaded any loops yet."}
              </p>
              {isOwnProfile && (
                <Link href="/upload">
                  <Button>Upload Your First Loop</Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {loops.map((loop) => (
                <LoopCard key={loop.id} loop={loop} />
              ))}
            </div>
          )}
        </TabsContent>

        {isOwnProfile && (
          <TabsContent value="favorites" className="mt-6">
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
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
