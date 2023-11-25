export const LOCATIONS = [
  "Point A",
  "Point B",
  "Point C",
  "Point D",
  "Point E",
  "Warehouse",
] as const;
export const VEHICLE_STATUS = ["idle", "in transit", "stopped"];
export const MOVEMENT_ERRORS: MovementError[] = [
  {
    problem: "GPS Lost",
    solution: "Reconnect",
  },
  {
    problem: "Flat Tire",
    solution: "Fix Tire",
  },
  {
    problem: "Fell into the Ocean",
    solution: "Fish It Out",
  },
];

export type Vehicle = {
  currentLocation: (typeof LOCATIONS)[number];
  name: string;
  id: number;
};

export type VehicleMovement = {
  location: (typeof LOCATIONS)[number];
  time: number | Date;
};

export type MovementUpdate = {
  movement: VehicleMovement;
  vehicle: Vehicle;
};

export type MovementError = {
  solution: string;
  problem: string;
};

export type VehicleMovementError = {
  vehicle: Vehicle;
  previousMovement: MovementUpdate;
} & MovementError;
