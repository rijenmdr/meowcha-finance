import { create } from "zustand";

// How many URL navigations are loading on the server. Each useUrlSearch()
// reports its own transition here, so ContentFrame can dim the page for any of them.
interface NavigationState {
  pendingCount: number;
  begin: () => void;
  end: () => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  pendingCount: 0,
  begin: () => set((state) => ({ pendingCount: state.pendingCount + 1 })),
  end: () => set((state) => ({ pendingCount: state.pendingCount - 1 })),
}));
