import { create } from 'zustand';

export interface MixLoop {
  id: string;
  slug: string;
  title: string;
  bpm: number;
  previewUrl: string;
  waveformData?: number[];
  user: {
    username: string;
  };
}

interface AudioState {
  currentlyPlayingId: string | null;
  mixLoops: MixLoop[];
  mixBpm: number | null;
  isMixPlaying: boolean;
  mixAudioRefs: Map<string, HTMLAudioElement>;
  mixVolumes: Map<string, number>;

  setCurrentlyPlaying: (id: string | null) => void;
  stopAll: () => void;
  addToMix: (loop: MixLoop) => boolean;
  removeFromMix: (loopId: string) => void;
  clearMix: () => void;
  canAddToMix: (bpm: number) => boolean;
  playMix: () => void;
  pauseMix: () => void;
  toggleMix: () => void;
  registerMixAudio: (loopId: string, audio: HTMLAudioElement) => void;
  unregisterMixAudio: (loopId: string) => void;
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

  setCurrentlyPlaying: (id) => {
    const state = get();
    if (state.isMixPlaying) {
      state.pauseMix();
    }
    set({ currentlyPlayingId: id });
  },

  stopAll: () => {
    const state = get();
    if (state.isMixPlaying) {
      state.pauseMix();
    }
    set({ currentlyPlayingId: null });
  },

  addToMix: (loop) => {
    const state = get();
    
    if (state.mixLoops.length >= MAX_MIX_LOOPS) {
      return false;
    }
    
    if (state.mixLoops.some(l => l.id === loop.id)) {
      return false;
    }
    
    if (state.mixBpm !== null && state.mixBpm !== loop.bpm) {
      return false;
    }
    
    if (state.currentlyPlayingId) {
      set({ currentlyPlayingId: null });
    }
    
    const newMixLoops = [...state.mixLoops, loop];
    const newVolumes = new Map(state.mixVolumes);
    newVolumes.set(loop.id, 0.8);
    
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
    state.mixAudioRefs.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });
    
    set({
      mixLoops: [],
      mixBpm: null,
      isMixPlaying: false,
      mixAudioRefs: new Map(),
      mixVolumes: new Map(),
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
    if (state.currentlyPlayingId) {
      set({ currentlyPlayingId: null });
    }
    
    const playPromises: Promise<void>[] = [];
    state.mixAudioRefs.forEach((audio, loopId) => {
      audio.currentTime = 0;
      const volume = state.mixVolumes.get(loopId) ?? 0.8;
      audio.volume = volume;
      playPromises.push(audio.play());
    });
    
    Promise.all(playPromises).then(() => {
      set({ isMixPlaying: true });
    }).catch((error) => {
      console.error('Failed to play mix:', error);
    });
  },

  pauseMix: () => {
    const state = get();
    state.mixAudioRefs.forEach((audio) => {
      audio.pause();
    });
    set({ isMixPlaying: false });
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
    
    const audio = state.mixAudioRefs.get(loopId);
    if (audio) {
      audio.volume = volume;
    }
    
    set({ mixVolumes: newVolumes });
  },
}));
