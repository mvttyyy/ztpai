'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { useAudioStore } from '@/stores/audio-store';

interface AudioPlayerProps {
  src: string;
  loopId?: string; // Unique identifier for this audio
  waveformData?: number[];
  onPlay?: () => void;
  onPause?: () => void;
  compact?: boolean;
  className?: string;
}

export function AudioPlayer({
  src,
  loopId,
  waveformData,
  onPlay,
  onPause,
  compact = false,
  className,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const { currentlyPlayingId, setCurrentlyPlaying, isMixPlaying, pauseMix } = useAudioStore();

  // Draw waveform
  const drawWaveform = useCallback((progress: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !waveformData || waveformData.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    // Only update canvas size if needed to avoid flickering
    const newWidth = rect.width * dpr;
    const newHeight = rect.height * dpr;
    if (canvas.width !== newWidth || canvas.height !== newHeight) {
      canvas.width = newWidth;
      canvas.height = newHeight;
    }
    
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const centerY = height / 2;
    const maxBarHeight = centerY * 0.85;
    
    // Calculate how many bars we can fit based on width
    const minBarWidth = 2;
    const minGap = 1;
    const maxBars = Math.floor(width / (minBarWidth + minGap));
    const barCount = Math.min(waveformData.length, maxBars);
    
    // Sample waveform data if we have more points than we can display
    const step = waveformData.length / barCount;
    const sampledData: number[] = [];
    for (let i = 0; i < barCount; i++) {
      const idx = Math.floor(i * step);
      sampledData.push(waveformData[idx]);
    }
    
    // Calculate bar dimensions to fit exactly in width
    const totalGapWidth = (barCount - 1) * minGap;
    const availableBarWidth = width - totalGapWidth;
    const barWidth = Math.max(minBarWidth, availableBarWidth / barCount);
    const gap = minGap;

    ctx.clearRect(0, 0, width, height);

    // Create gradient for played portion
    const playedGradient = ctx.createLinearGradient(0, 0, 0, height);
    playedGradient.addColorStop(0, '#c084fc');    // Light purple top
    playedGradient.addColorStop(0.5, '#a855f7');  // Primary purple center
    playedGradient.addColorStop(1, '#7c3aed');    // Darker purple bottom

    // Create gradient for unplayed portion
    const unplayedGradient = ctx.createLinearGradient(0, 0, 0, height);
    unplayedGradient.addColorStop(0, 'rgba(148, 163, 184, 0.4)');
    unplayedGradient.addColorStop(0.5, 'rgba(100, 116, 139, 0.35)');
    unplayedGradient.addColorStop(1, 'rgba(71, 85, 105, 0.3)');

    sampledData.forEach((value, index) => {
      const x = index * (barWidth + gap);
      const normalizedValue = Math.max(0.08, value); // Minimum height for visibility
      const barHeight = normalizedValue * maxBarHeight;
      const barProgress = (index + 0.5) / barCount; // Center of bar for more accurate progress
      const isPlayed = barProgress <= progress;
      
      // Rounded rectangle helper
      const drawRoundedBar = (bx: number, by: number, bw: number, bh: number, radius: number) => {
        const r = Math.min(radius, bw / 2, bh / 2);
        ctx.beginPath();
        ctx.moveTo(bx + r, by);
        ctx.lineTo(bx + bw - r, by);
        ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + r);
        ctx.lineTo(bx + bw, by + bh - r);
        ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - r, by + bh);
        ctx.lineTo(bx + r, by + bh);
        ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - r);
        ctx.lineTo(bx, by + r);
        ctx.quadraticCurveTo(bx, by, bx + r, by);
        ctx.closePath();
        ctx.fill();
      };

      // Add subtle glow effect for played bars
      if (isPlayed && progress > 0) {
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      } else {
        ctx.shadowBlur = 0;
      }

      ctx.fillStyle = isPlayed ? playedGradient : unplayedGradient;

      // Draw top bar (main waveform)
      drawRoundedBar(x, centerY - barHeight, barWidth, barHeight, 2);
      
      // Draw bottom reflection (smaller, with fade effect)
      ctx.shadowBlur = 0; // No glow on reflection
      const reflectionHeight = barHeight * 0.5;
      const reflectionGradient = ctx.createLinearGradient(0, centerY, 0, centerY + reflectionHeight);
      if (isPlayed) {
        reflectionGradient.addColorStop(0, 'rgba(168, 85, 247, 0.6)');
        reflectionGradient.addColorStop(1, 'rgba(168, 85, 247, 0.1)');
      } else {
        reflectionGradient.addColorStop(0, 'rgba(100, 116, 139, 0.25)');
        reflectionGradient.addColorStop(1, 'rgba(100, 116, 139, 0.05)');
      }
      ctx.fillStyle = reflectionGradient;
      drawRoundedBar(x, centerY + 2, barWidth, reflectionHeight, 2);
    });

    // Reset shadow
    ctx.shadowBlur = 0;
  }, [waveformData]);

  // Redraw waveform when time changes
  useEffect(() => {
    const progress = duration > 0 ? currentTime / duration : 0;
    drawWaveform(progress);
  }, [currentTime, duration, drawWaveform]);

  // Handle window resize only
  useEffect(() => {
    const handleResize = () => {
      const progress = duration > 0 ? currentTime / duration : 0;
      drawWaveform(progress);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [duration, currentTime, drawWaveform]);

  // Initial render when waveform data loads
  useEffect(() => {
    if (waveformData && waveformData.length > 0) {
      drawWaveform(0);
    }
  }, [waveformData]); // Only run when waveformData changes, not on every render

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('canplay', handleCanPlay);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, []);

  // Listen for global playback changes - stop this player if another starts
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !loopId) return;

    // If another loop is now playing, stop this one
    if (currentlyPlayingId && currentlyPlayingId !== loopId && isPlaying) {
      audio.pause();
      setIsPlaying(false);
      onPause?.();
    }
  }, [currentlyPlayingId, loopId, isPlaying, onPause]);

  // Stop single playback when mix starts
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isMixPlaying && isPlaying) {
      audio.pause();
      setIsPlaying(false);
      setCurrentlyPlaying(null);
      onPause?.();
    }
  }, [isMixPlaying, isPlaying, setCurrentlyPlaying, onPause]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      if (loopId) setCurrentlyPlaying(null);
      onPause?.();
    } else {
      // Stop mix if playing
      if (isMixPlaying) {
        pauseMix();
      }
      
      // Set this as the currently playing (will stop others via useEffect)
      if (loopId) {
        setCurrentlyPlaying(loopId);
      }
      
      try {
        await audio.play();
        setIsPlaying(true);
        onPlay?.();
      } catch (error) {
        console.error('Failed to play audio:', error);
        if (loopId) setCurrentlyPlaying(null);
      }
    }
  };

  const handleSeek = (value: number[]) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;

    const newTime = (value[0] / 100) * duration;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleWaveformClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const audio = audioRef.current;
    if (!canvas || !audio || !duration) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    // Clamp progress between 0 and 1
    const progress = Math.max(0, Math.min(1, x / rect.width));
    const newTime = progress * duration;
    
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <audio ref={audioRef} src={src} preload="metadata" />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={togglePlay}
          disabled={isLoading}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>
        <div className="flex-1 min-w-0">
          {waveformData && waveformData.length > 0 ? (
            <canvas
              ref={canvasRef}
              className="w-full h-8 cursor-pointer"
              style={{ width: '100%', height: '32px' }}
              onClick={handleWaveformClick}
            />
          ) : (
            <Slider
              value={[duration > 0 ? (currentTime / duration) * 100 : 0]}
              onValueChange={handleSeek}
              max={100}
              step={0.1}
              className="w-full"
            />
          )}
        </div>
        <span className="text-xs text-muted-foreground tabular-nums w-10">
          {formatTime(currentTime)}
        </span>
      </div>
    );
  }

  return (
    <div className={cn('bg-card rounded-lg p-4', className)}>
      <audio ref={audioRef} src={src} preload="metadata" />
      
      {/* Waveform or Progress bar */}
      <div className="mb-4">
        {waveformData && waveformData.length > 0 ? (
          <canvas
            ref={canvasRef}
            className="w-full h-16 cursor-pointer rounded"
            style={{ width: '100%', height: '64px' }}
            onClick={handleWaveformClick}
          />
        ) : (
          <Slider
            value={[duration > 0 ? (currentTime / duration) * 100 : 0]}
            onValueChange={handleSeek}
            max={100}
            step={0.1}
            className="w-full"
          />
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10"
          onClick={togglePlay}
          disabled={isLoading}
        >
          {isPlaying ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5 ml-0.5" />
          )}
        </Button>

        <div className="flex items-center gap-2 text-sm text-muted-foreground tabular-nums">
          <span>{formatTime(currentTime)}</span>
          <span>/</span>
          <span>{formatTime(duration)}</span>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsMuted(!isMuted)}
          >
            {isMuted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
          <Slider
            value={[isMuted ? 0 : volume * 100]}
            onValueChange={(value) => {
              setVolume(value[0] / 100);
              setIsMuted(false);
            }}
            max={100}
            step={1}
            className="w-24"
          />
        </div>
      </div>
    </div>
  );
}
