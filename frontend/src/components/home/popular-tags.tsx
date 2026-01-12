'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { tagsApi } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

interface Tag {
  id: string;
  name: string;
  _count?: {
    loops: number;
  };
}

export function PopularTags() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = async () => {
    try {
      const response = await tagsApi.getPopular(20);
      setTags(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load tags');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error || tags.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap justify-center gap-2">
      {tags.map((tag) => (
        <Link key={tag.id} href={`/browse?tag=${tag.name}`}>
          <Badge
            variant="secondary"
            className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-sm px-4 py-2"
          >
            #{tag.name}
            {tag._count && (
              <span className="ml-2 opacity-60">({tag._count.loops})</span>
            )}
          </Badge>
        </Link>
      ))}
    </div>
  );
}
