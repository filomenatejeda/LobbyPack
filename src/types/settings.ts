export type PreferenceItem = {
  title: string;
  description: string;
};

export type TeamItem = {
  name: string;
  role: string;
  status: string;
};

export type FloorConfig = {
  floorNumber: number;
  apartments: string[];
};

export type TowerConfig = {
  id: number;
  name: string;
  floors: FloorConfig[];
  selectedFloor: number;
  isEditing: boolean;
};
