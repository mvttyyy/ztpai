"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { downloadsApi } from "@/lib/api";
import { Loader2, Download, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface DownloadItem {
  id: string;
  createdAt: string;
  loop: {
    id: string;
    title: string;
    genre?: string;
    bpm: number;
    user: {
      username: string;
    };
  };
}

export default function DownloadsPage() {
  const { isAuthenticated } = useAuthStore();
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    downloadsApi
      .getMyDownloads()
      .then((res) => setDownloads(res.data))
      .catch(() => setError("Failed to load downloads"))
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  if (!isAuthenticated) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Download className="h-8 w-8" />
          My Downloads
        </h1>
        <p className="text-muted-foreground mt-2">
          All loops you've downloaded
        </p>
      </div>
      <div className="bg-card rounded-xl border p-6 min-h-[200px]">
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-destructive text-center">{error}</div>
        ) : downloads.length === 0 ? (
          <div className="text-center text-muted-foreground">No downloads yet.</div>
        ) : (
          <ul className="space-y-4">
            {downloads.map((d) => (
              <li
                key={d.id}
                className="flex items-start gap-4 p-4 rounded-lg border bg-background"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{d.loop.title}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(d.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-1 text-base">
                    Genre: {d.loop.genre || "-"} | BPM: {d.loop.bpm} | By: {d.loop.user.username}
                  </div>
                </div>
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="ml-2"
                >
                  <a href={`/loops/${d.loop.id}`} target="_blank" rel="noopener noreferrer">
                    <Music className="h-4 w-4 mr-1" /> View Loop
                  </a>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
