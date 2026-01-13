"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { commentsApi } from "@/lib/api";
import { Loader2, MessageSquare, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  loop: {
    id: string;
    title: string;
  };
}

export default function CommentsPage() {
  const { isAuthenticated, user } = useAuthStore();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    commentsApi
      .getMyComments()
      .then((res) => setComments(res.data))
      .catch(() => setError("Failed to load comments"))
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;
    try {
      await commentsApi.delete(id);
      setComments((prev) => prev.filter((c) => c.id !== id));
    } catch {}
  };

  if (!isAuthenticated) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <MessageSquare className="h-8 w-8" />
          My Comments
        </h1>
        <p className="text-muted-foreground mt-2">
          All comments you've posted on loops
        </p>
      </div>
      <div className="bg-card rounded-xl border p-6 min-h-[200px]">
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-destructive text-center">{error}</div>
        ) : comments.length === 0 ? (
          <div className="text-center text-muted-foreground">No comments yet.</div>
        ) : (
          <ul className="space-y-4">
            {comments.map((c) => (
              <li
                key={c.id}
                className="flex items-start gap-4 p-4 rounded-lg border bg-background"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{c.loop.title}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(c.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-1 text-base">{c.content}</div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => handleDelete(c.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
