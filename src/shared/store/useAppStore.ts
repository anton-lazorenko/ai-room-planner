import { create } from "zustand";

type AppState = {
  loading: boolean;
  setLoading: (value: boolean) => void;
};

export const useAppStore = create<AppState>((set) => ({
  loading: true,
  setLoading: (value) => set({ loading: value }),
}));