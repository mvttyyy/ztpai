"use client";

import { useEffect, useState } from "react";
import { tagsApi } from "@/lib/api";
import { Loader2, Tag } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface TagType {
  id: string;
  name: string;
  loopsCount: number;
}

export default function TagsPage() {
  const [tags, setTags] = useState<TagType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    tagsApi
      .getAll()
      .then((res) => setTags(res.data))
      .catch(() => setError("Failed to load tags"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Tag className="h-8 w-8 text-blue-500" />
          Browse Tags
        </h1>
        <p className="text-muted-foreground mt-2">
          Discover loops by tags and genres
        </p>
      </div>
      <div className="bg-card rounded-xl border p-6 min-h-[200px]">
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-destructive text-center">{error}</div>
        ) : tags.length === 0 ? (
          <div className="text-center text-muted-foreground">No tags found.</div>
        ) : (
          <ul className="flex flex-wrap gap-3">
            {tags.map((tag) => (
              <li key={tag.id}>
                <Link href={`/browse?tag=${encodeURIComponent(tag.name)}`}>
                  <Badge className="cursor-pointer text-base px-4 py-2">
                    {tag.name} <span className="ml-2 text-xs text-muted-foreground">({tag.loopsCount})</span>
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
