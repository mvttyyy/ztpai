'use client';

import { useRef, useEffect, useState } from 'react';
import { Play, Pause, X, Volume2, Trash2, Layers, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAudioStore, MixLoop } from '@/stores/audio-store';

interface MixLoopItemProps {
  loop: MixLoop;
  isPlaying: boolean;
}

function MixLoopItem({ loop, isPlaying }: MixLoopItemProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const { 
    removeFromMix, 
    registerMixAudio, 
    unregisterMixAudio,
    mixVolumes,
    setMixVolume,
    isMixPlaying,
  } = useAudioStore();

  const volume = mixVolumes.get(loop.id) ?? 0.8;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    registerMixAudio(loop.id, audio);

    const handleEnded = () => {
      audio.currentTime = 0;
      if (isMixPlaying) {
        audio.play();
      }
    };

    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('ended', handleEnded);
      unregisterMixAudio(loop.id);
    };
  }, [loop.id, registerMixAudio, unregisterMixAudio, isMixPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isMixPlaying && audio.paused) {
      audio.play().catch(console.error);
    } else if (!isMixPlaying && !audio.paused) {
      audio.pause();
    }
  }, [isMixPlaying]);

  return (
    <div className="flex items-center gap-3 p-2 bg-background/50 rounded-lg group">
      <audio ref={audioRef} src={loop.previewUrl} preload="metadata" loop />
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{loop.title}</p>
        <p className="text-xs text-muted-foreground truncate">
          by {loop.user.username}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Volume2 className="h-3 w-3 text-muted-foreground" />
        <Slider
          value={[volume * 100]}
          onValueChange={(value) => setMixVolume(loop.id, value[0] / 100)}
          max={100}
          step={1}
          className="w-16"
        />
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={() => removeFromMix(loop.id)}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}

export function MixerPanel() {
  const [isMinimized, setIsMinimized] = useState(false);
  const { 
    mixLoops, 
    mixBpm, 
    isMixPlaying, 
    toggleMix, 
    clearMix,
  } = useAudioStore();

  if (mixLoops.length === 0) {
    return null;
  }

  return (
    <div 
      className={cn(
        'fixed bottom-4 right-4 z-50 w-80 bg-card border border-border rounded-xl shadow-2xl transition-all duration-300',
        isMinimized && 'w-auto'
      )}
    >
      <div 
        className="flex items-center gap-2 p-3 border-b border-border cursor-pointer"
        onClick={() => setIsMinimized(!isMinimized)}
      >
        <div className="flex items-center gap-2 flex-1">
          <Layers className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">Loop Mixer</span>
          <Badge variant="secondary" className="text-xs">
            {mixLoops.length}/4
          </Badge>
          {mixBpm && (
            <Badge variant="outline" className="text-xs">
              {mixBpm} BPM
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6">
          {isMinimized ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </div>

      {!isMinimized && (
        <>
          <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
            {mixLoops.map((loop) => (
              <MixLoopItem 
                key={loop.id} 
                loop={loop} 
                isPlaying={isMixPlaying} 
              />
            ))}
          </div>

          <div className="flex items-center gap-2 p-3 border-t border-border bg-muted/30">
            <Button
              variant={isMixPlaying ? 'default' : 'outline'}
              size="sm"
              className="flex-1 gap-2"
              onClick={toggleMix}
              disabled={mixLoops.length === 0}
            >
              {isMixPlaying ? (
                <>
                  <Pause className="h-4 w-4" />
                  Pause All
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Play All
                </>
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={clearMix}
              title="Clear all"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
