"use client";

import { useEffect, useState } from "react";
import { Loader2, HeartPulse } from "lucide-react";

interface HealthStatus {
  status: string;
  uptime: number;
  version?: string;
}

export default function HealthPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => setHealth(data))
      .catch(() => setError("Failed to fetch health status"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container mx-auto px-4 py-8 max-w-md">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <HeartPulse className="h-8 w-8 text-pink-500" />
          Service Health
        </h1>
        <p className="text-muted-foreground mt-2">
          Status and uptime of backend services
        </p>
      </div>
      <div className="bg-card rounded-xl border p-6 min-h-[120px] flex flex-col items-center justify-center">
        {loading ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : error ? (
          <div className="text-destructive text-center">{error}</div>
        ) : health ? (
          <div className="text-center">
            <div className="text-lg font-semibold mb-2">
              Status: <span className={health.status === "ok" ? "text-green-600" : "text-red-600"}>{health.status}</span>
            </div>
            <div className="text-sm text-muted-foreground mb-1">
              Uptime: {Math.floor(health.uptime / 60)} min
            </div>
            {health.version && (
              <div className="text-sm text-muted-foreground">Version: {health.version}</div>
            )}
          </div>
        ) : (
          <div className="text-muted-foreground">No health data available.</div>
        )}
      </div>
    </div>
  );
}
