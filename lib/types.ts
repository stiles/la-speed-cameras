export type StatusKey = "construction" | "warning" | "ticketing" | "active" | "unknown";

export type Corridor = {
  slug: string;
  street: string;
  street_slug: string;
  from: string;
  to: string;
  district: number;
  speed_limit: number | null;
  school_nearby: boolean;
  speed_collisions: number | null;
  percent_speeding: number | null;
  length_miles: number | null;
  status: StatusKey;
  status_label: string | null;
  system_id: string | null;
  hoods: string[];
  cameras: string[];
  center: [number, number];
  bbox: [number, number, number, number];
};

export type Neighborhood = {
  slug: string;
  name: string;
  region: string;
  region_name: string;
  type: string;
  city: string;
  in_la_city: boolean;
  corridors: string[];
  camera_count: number;
  streets: string[];
  districts: number[];
  adjacent: string[];
  nearest: { corridor: string; miles: number }[];
  bbox: [number, number, number, number];
  center: [number, number];
  area_sqmi: number;
  shape: Shape;
};

export type Shape = { w: number; h: number; path: string; dots: [number, number][] };

export type District = {
  n: number;
  member: string | null;
  camera_count: number;
  hoods: string[];
  bbox: [number, number, number, number];
  area_sqmi: number;
  shape: Shape;
};

export type Street = {
  slug: string;
  name: string;
  corridors: string[];
  camera_count: number;
  hoods: string[];
  districts: number[];
};

export type CameraProps = {
  id: string;
  corridor: string;
  street: string;
  from: string;
  to: string;
  direction: string | null;
  bearing: number | null;
  side: string | null;
  district: number;
  speed_limit: number | null;
  status: StatusKey;
  status_label: string | null;
  hood: string;
  dist_from_corridor_ft: number | null;
};

export type Camera = CameraProps & { coordinates: [number, number] };

export type Meta = {
  data_updated: string;
  sources: Record<string, string>;
  source_edited: Record<string, string | null>;
  counts: {
    cameras: number;
    corridors: number;
    neighborhoods_with_cameras: number;
    council_districts: number;
    miles: number;
  };
  status_counts: Partial<Record<StatusKey, number>>;
  warnings: string[];
  changelog: { date: string; changes: string[] }[];
};

export type HistoryEntry = {
  coords: [number, number];
  status: StatusKey;
  status_label: string | null;
  first_seen: string | null;
  status_changed_at: string | null;
};

export type SearchItem = {
  kind: "neighborhood" | "street" | "corridor" | "district";
  label: string;
  sub: string;
  href: string;
  bbox?: [number, number, number, number];
};
