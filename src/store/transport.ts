import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { DEFAULT_METRO_STATIONS } from '@/features/transport/metro-lines';
import {
  DEFAULT_FOLLOWED_STATIONS,
  stationDisplayName,
  type City,
  type FollowedStation,
} from '@/features/transport/youbike';
import { persistStorage } from '@/lib/storage';

export interface FollowedYoubike extends FollowedStation {
  sna: string;
}

interface TransportState {
  /** YouBike stations shown on the 交通 page, in the order added. */
  youbike: FollowedYoubike[];
  /** MRT stations shown on the 交通 page. */
  metro: string[];
  followYoubike: (sna: string, nickname: string, city: City) => void;
  unfollowYoubike: (sna: string, city: City) => void;
  renameYoubike: (sna: string, nickname: string, city: City) => void;
  addMetro: (station: string) => void;
  removeMetro: (station: string) => void;
  reset: () => void;
}

const initialState = () => ({
  youbike: Object.entries(DEFAULT_FOLLOWED_STATIONS).map(([sna, data]) => ({ sna, ...data })),
  metro: [...DEFAULT_METRO_STATIONS],
});

export const useTransportStore = create<TransportState>()(
  persist(
    (set) => ({
      ...initialState(),
      followYoubike: (sna, nickname, city) =>
        set((state) =>
          state.youbike.some((s) => s.sna === sna && s.city === city)
            ? state
            : { youbike: [...state.youbike, { sna, nickname: nickname.trim() || stationDisplayName(sna), city }] },
        ),
      unfollowYoubike: (sna, city) =>
        set((state) => ({ youbike: state.youbike.filter((s) => s.sna !== sna || s.city !== city) })),
      renameYoubike: (sna, nickname, city) =>
        set((state) => ({
          youbike: state.youbike.map((s) =>
            s.sna === sna && s.city === city
              ? { ...s, nickname: nickname.trim() || stationDisplayName(sna) }
              : s,
          ),
        })),
      addMetro: (station) =>
        set((state) => (state.metro.includes(station) ? state : { metro: [...state.metro, station] })),
      removeMetro: (station) => set((state) => ({ metro: state.metro.filter((s) => s !== station) })),
      reset: () => set(initialState()),
    }),
    {
      name: 'ck.transport',
      storage: persistStorage,
      version: 1,
      partialize: ({ youbike, metro }) => ({ youbike, metro }),
    },
  ),
);
