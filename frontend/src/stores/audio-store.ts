import { create } from 'zustand';

export interface MixLoop {
  id: string;
  slug: string;
  title: string;
  bpm: number;
  duration: number;
  previewUrl: string;
  waveformData?: number[];
  user: {
    username: string;
  };
}

interface AudioState {
  // Currently playing single loop (normal mode)
  currentlyPlayingId: string | null;
  
  // Mix mode - multiple loops playing together
  mixLoops: MixLoop[];
  mixBpm: number | null;
  isMixPlaying: boolean;
  mixAudioRefs: Map<string, HTMLAudioElement>;
  mixLoopTimerId: NodeJS.Timeout | null;
  
  // Actions for single playback
  setCurrentlyPlaying: (id: string | null) => void;
  stopAll: () => void;
  
  // Actions for mix mode
  addToMix: (loop: MixLoop) => boolean;
  removeFromMix: (loopId: string) => void;
  clearMix: () => void;
  canAddToMix: (bpm: number) => boolean;
  
  // Mix playback control
  playMix: () => void;
  pauseMix: () => void;
  toggleMix: () => void;
  registerMixAudio: (loopId: string, audio: HTMLAudioElement) => void;
  unregisterMixAudio: (loopId: string) => void;
  
  // Mix volume control
  mixVolumes: Map<string, number>;
  setMixVolume: (loopId: string, volume: number) => void;
}

const MAX_MIX_LOOPS = 4;

export const useAudioStore = create<AudioState>((set, get) => ({
  currentlyPlayingId: null,
  mixLoops: [],
  mixBpm: null,
  isMixPlaying: false,
  mixAudioRefs: new Map(),
  mixVolumes: new Map(),
  mixLoopTimerId: null,

  setCurrentlyPlaying: (id) => {
    const state = get();
    
    // Stop mix if playing
    if (state.isMixPlaying) {
      state.pauseMix();
    }
    
    set({ currentlyPlayingId: id });
  },

  stopAll: () => {
    const state = get();
    
    // Stop mix playback
    if (state.isMixPlaying) {
      state.pauseMix();
    }
    
    set({ currentlyPlayingId: null });
  },

  addToMix: (loop) => {
    const state = get();
    
    // Check max loops
    if (state.mixLoops.length >= MAX_MIX_LOOPS) {
      return false;
    }
    
    // Check if already in mix
    if (state.mixLoops.some(l => l.id === loop.id)) {
      return false;
    }
    
    // Check BPM compatibility
    if (state.mixBpm !== null && state.mixBpm !== loop.bpm) {
      return false;
    }
    
    // Stop single playback when adding to mix
    if (state.currentlyPlayingId) {
      set({ currentlyPlayingId: null });
    }
    
    const newMixLoops = [...state.mixLoops, loop];
    const newVolumes = new Map(state.mixVolumes);
    newVolumes.set(loop.id, 0.8); // Default volume
    
    set({
      mixLoops: newMixLoops,
      mixBpm: loop.bpm,
      mixVolumes: newVolumes,
    });
    
    return true;
  },

  removeFromMix: (loopId) => {
    const state = get();
    const newMixLoops = state.mixLoops.filter(l => l.id !== loopId);
    const newVolumes = new Map(state.mixVolumes);
    newVolumes.delete(loopId);
    
    // Unregister audio ref
    const audio = state.mixAudioRefs.get(loopId);
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    const newRefs = new Map(state.mixAudioRefs);
    newRefs.delete(loopId);
    
    set({
      mixLoops: newMixLoops,
      mixBpm: newMixLoops.length > 0 ? newMixLoops[0].bpm : null,
      mixVolumes: newVolumes,
      mixAudioRefs: newRefs,
      isMixPlaying: newMixLoops.length === 0 ? false : state.isMixPlaying,
    });
  },

  clearMix: () => {
    const state = get();
    
    // Stop all audio
    state.mixAudioRefs.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });
    
    // Clear loop timer
    if (state.mixLoopTimerId) {
      clearTimeout(state.mixLoopTimerId);
    }
    
    set({
      mixLoops: [],
      mixBpm: null,
      isMixPlaying: false,
      mixAudioRefs: new Map(),
      mixVolumes: new Map(),
      mixLoopTimerId: null,
    });
  },

  canAddToMix: (bpm) => {
    const state = get();
    
    if (state.mixLoops.length >= MAX_MIX_LOOPS) {
      return false;
    }
    
    if (state.mixBpm !== null && state.mixBpm !== bpm) {
      return false;
    }
    
    return true;
  },

  playMix: () => {
    const state = get();
    
    // Stop single playback
    if (state.currentlyPlayingId) {
      set({ currentlyPlayingId: null });
    }
    
    // Clear previous timer
    if (state.mixLoopTimerId) {
      clearTimeout(state.mixLoopTimerId);
    }
    
    // Find the longest loop duration
    const maxDuration = Math.max(...state.mixLoops.map(loop => loop.duration));
    
    // Play all mix audios simultaneously
    const playPromises: Promise<void>[] = [];
    state.mixAudioRefs.forEach((audio, loopId) => {
      audio.currentTime = 0;
      audio.loop = false; // Disable individual looping
      const volume = state.mixVolumes.get(loopId) ?? 0.8;
      audio.volume = volume;
      playPromises.push(audio.play());
    });
    
    // Set up timer to restart all loops when the longest one ends
    const timerId = setTimeout(() => {
      const currentState = get();
      if (currentState.isMixPlaying) {
        // Restart all loops from beginning
        currentState.mixAudioRefs.forEach((audio, loopId) => {
          audio.currentTime = 0;
          const volume = currentState.mixVolumes.get(loopId) ?? 0.8;
          audio.volume = volume;
          audio.play().catch(console.error);
        });
        // Recursively set next timer
        get().playMix();
      }
    }, maxDuration * 1000);
    
    Promise.all(playPromises).then(() => {
      set({ isMixPlaying: true, mixLoopTimerId: timerId });
    }).catch((error) => {
      console.error('Failed to play mix:', error);
      clearTimeout(timerId);
    });
  },

  pauseMix: () => {
    const state = get();
    
    // Clear the loop timer
    if (state.mixLoopTimerId) {
      clearTimeout(state.mixLoopTimerId);
    }
    
    state.mixAudioRefs.forEach((audio) => {
      audio.pause();
    });
    
    set({ isMixPlaying: false, mixLoopTimerId: null });
  },

  toggleMix: () => {
    const state = get();
    if (state.isMixPlaying) {
      state.pauseMix();
    } else {
      state.playMix();
    }
  },

  registerMixAudio: (loopId, audio) => {
    const state = get();
    const newRefs = new Map(state.mixAudioRefs);
    newRefs.set(loopId, audio);
    set({ mixAudioRefs: newRefs });
  },

  unregisterMixAudio: (loopId) => {
    const state = get();
    const newRefs = new Map(state.mixAudioRefs);
    newRefs.delete(loopId);
    set({ mixAudioRefs: newRefs });
  },

  setMixVolume: (loopId, volume) => {
    const state = get();
    const newVolumes = new Map(state.mixVolumes);
    newVolumes.set(loopId, volume);
    
    // Update audio element volume if exists
    const audio = state.mixAudioRefs.get(loopId);
    if (audio) {
      audio.volume = volume;
    }
    
    set({ mixVolumes: newVolumes });
  },
}));
