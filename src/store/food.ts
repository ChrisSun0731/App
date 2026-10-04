import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage } from '@/lib/storage';

interface FoodState {
  /** Favourite restaurants, by name (names are unique in restaurantData.json). */
  favorites: string[];
  toggleFavorite: (name: string) => void;
  reset: () => void;
}

export const useFoodStore = create<FoodState>()(
  persist(
    (set) => ({
      favorites: [],
      toggleFavorite: (name) =>
        set((state) => ({
          favorites: state.favorites.includes(name)
            ? state.favorites.filter((n) => n !== name)
            : [...state.favorites, name],
        })),
      reset: () => set({ favorites: [] }),
    }),
    {
      name: 'ck.food',
      storage: persistStorage,
      version: 1,
      partialize: ({ favorites }) => ({ favorites }),
    },
  ),
);
