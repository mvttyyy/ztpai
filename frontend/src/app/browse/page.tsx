'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { loopsApi, tagsApi } from '@/lib/api';
import { LoopCard } from '@/components/loops/loop-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Search, X, SlidersHorizontal } from 'lucide-react';

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

interface Tag {
  id: string;
  name: string;
}

const GENRES = [
  'Hip Hop',
  'Trap',
  'R&B',
  'Pop',
  'Electronic',
  'House',
  'Techno',
  'Dubstep',
  'Drum & Bass',
  'Lo-Fi',
  'Jazz',
  'Rock',
  'Ambient',
  'World',
  'Other',
];

const KEYS = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
  'Cm', 'C#m', 'Dm', 'D#m', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'A#m', 'Bm',
];

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Newest' },
  { value: 'downloadCount', label: 'Most Downloads' },
  { value: 'listenCount', label: 'Most Plays' },
  { value: 'averageRating', label: 'Top Rated' },
  { value: 'bpm', label: 'BPM' },
];

export default function BrowsePage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [loops, setLoops] = useState<Loop[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // Filter state
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    genre: searchParams.get('genre') || '',
    key: searchParams.get('key') || '',
    tag: searchParams.get('tag') || '',
    bpmMin: parseInt(searchParams.get('bpmMin') || '60'),
    bpmMax: parseInt(searchParams.get('bpmMax') || '200'),
    sortBy: searchParams.get('sortBy') || 'createdAt',
    sortOrder: (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc',
    page: parseInt(searchParams.get('page') || '1'),
  });

  const [selectedTags, setSelectedTags] = useState<string[]>(
    filters.tag ? filters.tag.split(',') : []
  );

  // Load tags on mount
  useEffect(() => {
    tagsApi.getAll().then((res) => setTags(res.data));
  }, []);

  // Load loops when filters change
  const loadLoops = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        page: filters.page,
        limit: 12,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      };

      if (filters.search) params.search = filters.search;
      if (filters.genre) params.genre = filters.genre;
      if (filters.key) params.key = filters.key;
      if (selectedTags.length > 0) params.tag = selectedTags.join(',');
      if (filters.bpmMin > 60) params.bpmMin = filters.bpmMin;
      if (filters.bpmMax < 200) params.bpmMax = filters.bpmMax;

      const response = await loopsApi.getAll(params);
      setLoops(response.data.data || response.data);
      setTotalPages(response.data.totalPages || 1);
    } catch (error) {
      console.error('Failed to load loops:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, selectedTags]);

  useEffect(() => {
    loadLoops();
  }, [loadLoops]);

  // Update URL params
  const updateUrlParams = (newFilters: typeof filters, newTags: string[]) => {
    const params = new URLSearchParams();
    if (newFilters.search) params.set('search', newFilters.search);
    if (newFilters.genre) params.set('genre', newFilters.genre);
    if (newFilters.key) params.set('key', newFilters.key);
    if (newTags.length > 0) params.set('tag', newTags.join(','));
    if (newFilters.bpmMin > 60) params.set('bpmMin', String(newFilters.bpmMin));
    if (newFilters.bpmMax < 200) params.set('bpmMax', String(newFilters.bpmMax));
    if (newFilters.sortBy !== 'createdAt') params.set('sortBy', newFilters.sortBy);
    if (newFilters.sortOrder !== 'desc') params.set('sortOrder', newFilters.sortOrder);
    if (newFilters.page > 1) params.set('page', String(newFilters.page));

    router.push(`/browse?${params.toString()}`, { scroll: false });
  };

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value, page: 1 };
    setFilters(newFilters);
    updateUrlParams(newFilters, selectedTags);
  };

  const handleTagToggle = (tagName: string) => {
    const newTags = selectedTags.includes(tagName)
      ? selectedTags.filter((t) => t !== tagName)
      : [...selectedTags, tagName];
    setSelectedTags(newTags);
    const newFilters = { ...filters, page: 1 };
    setFilters(newFilters);
    updateUrlParams(newFilters, newTags);
  };

  const clearFilters = () => {
    const defaultFilters = {
      search: '',
      genre: '',
      key: '',
      tag: '',
      bpmMin: 60,
      bpmMax: 200,
      sortBy: 'createdAt',
      sortOrder: 'desc' as const,
      page: 1,
    };
    setFilters(defaultFilters);
    setSelectedTags([]);
    router.push('/browse');
  };

  const hasActiveFilters =
    filters.search ||
    filters.genre ||
    filters.key ||
    selectedTags.length > 0 ||
    filters.bpmMin > 60 ||
    filters.bpmMax < 200;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Browse Loops</h1>
          <p className="text-muted-foreground mt-1">
            Discover free loops and samples for your next project
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search loops..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant={showFilters ? 'default' : 'outline'}
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-card rounded-lg border p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Genre */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Genre</label>
              <Select
                value={filters.genre || 'all'}
                onValueChange={(value) => handleFilterChange('genre', value === 'all' ? '' : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All genres" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All genres</SelectItem>
                  {GENRES.map((genre) => (
                    <SelectItem key={genre} value={genre}>
                      {genre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Key */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Key</label>
              <Select
                value={filters.key || 'all'}
                onValueChange={(value) => handleFilterChange('key', value === 'all' ? '' : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All keys" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All keys</SelectItem>
                  {KEYS.map((key) => (
                    <SelectItem key={key} value={key}>
                      {key}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* BPM Range */}
            <div className="space-y-2 lg:col-span-2">
              <label className="text-sm font-medium">
                BPM Range: {filters.bpmMin} - {filters.bpmMax}
              </label>
              <div className="pt-2 px-2">
                <Slider
                  value={[filters.bpmMin, filters.bpmMax]}
                  onValueChange={([min, max]) => {
                    setFilters({ ...filters, bpmMin: min, bpmMax: max });
                  }}
                  onValueCommit={([min, max]) => {
                    const newFilters = { ...filters, bpmMin: min, bpmMax: max, page: 1 };
                    updateUrlParams(newFilters, selectedTags);
                  }}
                  min={60}
                  max={200}
                  step={1}
                />
              </div>
            </div>

            {/* Sort */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Sort by</label>
              <Select
                value={filters.sortBy}
                onValueChange={(value) => handleFilterChange('sortBy', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sort Order */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Order</label>
              <Select
                value={filters.sortOrder}
                onValueChange={(value) => handleFilterChange('sortOrder', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Descending</SelectItem>
                  <SelectItem value="asc">Ascending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="mt-6">
              <label className="text-sm font-medium mb-3 block">Tags</label>
              <div className="flex flex-wrap gap-2">
                {tags.slice(0, 20).map((tag) => (
                  <Badge
                    key={tag.id}
                    variant={selectedTags.includes(tag.name) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => handleTagToggle(tag.name)}
                  >
                    {tag.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Clear Filters */}
          {hasActiveFilters && (
            <div className="mt-6 flex justify-end">
              <Button variant="ghost" onClick={clearFilters}>
                <X className="h-4 w-4 mr-2" />
                Clear all filters
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Active Filters Display */}
      {hasActiveFilters && !showFilters && (
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {filters.search && (
            <Badge variant="secondary" className="gap-1">
              Search: {filters.search}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleFilterChange('search', '')}
              />
            </Badge>
          )}
          {filters.genre && (
            <Badge variant="secondary" className="gap-1">
              {filters.genre}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleFilterChange('genre', '')}
              />
            </Badge>
          )}
          {filters.key && (
            <Badge variant="secondary" className="gap-1">
              Key: {filters.key}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleFilterChange('key', '')}
              />
            </Badge>
          )}
          {selectedTags.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1">
              #{tag}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleTagToggle(tag)}
              />
            </Badge>
          ))}
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear all
          </Button>
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : loops.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-xl text-muted-foreground mb-4">No loops found</p>
          <p className="text-muted-foreground mb-6">
            Try adjusting your filters or search query
          </p>
          {hasActiveFilters && (
            <Button variant="outline" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {loops.map((loop) => (
              <LoopCard key={loop.id} loop={loop} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <Button
                variant="outline"
                disabled={filters.page === 1}
                onClick={() => handleFilterChange('page', filters.page - 1)}
              >
                Previous
              </Button>
              <span className="flex items-center px-4 text-sm text-muted-foreground">
                Page {filters.page} of {totalPages}
              </span>
              <Button
                variant="outline"
                disabled={filters.page === totalPages}
                onClick={() => handleFilterChange('page', filters.page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
