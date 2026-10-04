import type { StationWithDistance } from './youbike';

export interface MapPoint {
  latitude: number;
  longitude: number;
}

export interface StationMapProps {
  point: MapPoint;
  stations: StationWithDistance[];
  onSelect: (point: MapPoint) => void;
}
