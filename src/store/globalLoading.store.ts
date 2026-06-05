import { create } from 'zustand';

/** Delay before hiding overlay when pending count reaches zero (reduces flicker). */
const HIDE_DELAY_MS = 150;

interface GlobalLoadingState {
  pendingCount: number;
  showOverlay: boolean;
}

interface GlobalLoadingActions {
  startRequest: () => void;
  endRequest: () => void;
  reset: () => void;
}

let hideTimer: ReturnType<typeof setTimeout> | null = null;

function clearHideTimer(): void {
  if (hideTimer !== null) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
}

export const useGlobalLoadingStore = create<
  GlobalLoadingState & GlobalLoadingActions
>((set, get) => ({
  pendingCount: 0,
  showOverlay: false,

  startRequest: () => {
    clearHideTimer();
    set((s) => ({
      pendingCount: s.pendingCount + 1,
      showOverlay: true,
    }));
  },

  endRequest: () => {
    const next = Math.max(0, get().pendingCount - 1);
    set({ pendingCount: next });

    if (next === 0) {
      clearHideTimer();
      hideTimer = setTimeout(() => {
        if (get().pendingCount === 0) {
          set({ showOverlay: false });
        }
        hideTimer = null;
      }, HIDE_DELAY_MS);
    }
  },

  reset: () => {
    clearHideTimer();
    set({ pendingCount: 0, showOverlay: false });
  },
}));

/** Used by Axios interceptors (non-React). */
export const globalLoadingActions = {
  startRequest: () => useGlobalLoadingStore.getState().startRequest(),
  endRequest: () => useGlobalLoadingStore.getState().endRequest(),
  reset: () => useGlobalLoadingStore.getState().reset(),
};
