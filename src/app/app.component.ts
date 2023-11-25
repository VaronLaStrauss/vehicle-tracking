import { CommonModule } from "@angular/common";
import { Component, OnDestroy, WritableSignal, signal } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { MatToolbarModule } from "@angular/material/toolbar";
import {
  BehaviorSubject,
  Subject,
  catchError,
  concatMap,
  defer,
  map,
  of,
  startWith,
  switchMap,
  take,
  tap,
  timer,
  withLatestFrom,
} from "rxjs";
import {
  LOCATIONS,
  MOVEMENT_ERRORS,
  MovementError,
  MovementUpdate,
  Vehicle,
  VehicleMovement,
  VehicleMovementError,
} from "./helpers";

@Component({
  selector: "vt-root",
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatCardModule,
    MatButtonModule,
    MatProgressBarModule,
    MatToolbarModule,
  ],
  templateUrl: "./app.component.html",
  styles: [],
})
export class AppComponent implements OnDestroy {
  vehicles: WritableSignal<Vehicle[]> = signal(
    Array.from({ length: 10 }).map(
      (_, i) =>
        ({
          currentLocation: "Warehouse",
          name: `Vehicle ${i}`,
          id: i,
        } satisfies Vehicle)
    )
  );
  vehicleMovement$ = new Subject<MovementUpdate>();
  updates$ = new BehaviorSubject<
    (
      | MovementUpdate
      | ((MovementUpdate & { arrived: boolean }) | VehicleMovementError)
    )[]
  >([]);
  moving = new Map<number, MovementUpdate>();
  errors = new Map<number, VehicleMovementError>();

  movementSub = this.vehicleMovement$
    .pipe(
      withLatestFrom(this.updates$.pipe(startWith([]))),
      tap(([movement, previousMovements]) => {
        this.moving.set(movement.vehicle.id, movement);
        this.updates$.next([...previousMovements, movement]);
      }),
      map(([movement, previousMovements]) => {
        const randError = Math.random();
        const ERR_THRESHOLD = 0.7;
        if (randError >= ERR_THRESHOLD) {
          const err = getRandomError();
          throw [
            {
              ...err,
              vehicle: movement.vehicle,
              previousMovement: movement,
            } satisfies VehicleMovementError,
            previousMovements,
          ] as PairwiseMovement;
        }
        return [movement, previousMovements] as PairwiseMovement;
      }),
      catchError(([err, previousMovements]: PairwiseMovement, caught) => {
        this.errors.set(err.vehicle.id, err as VehicleMovementError);
        this.moving.delete(err.vehicle.id);
        this.updates$.next([...previousMovements, err]);

        return caught;
      }),
      concatMap(([movement]: PairwiseMovement) => {
        return timer((movement as MovementUpdate).movement.time).pipe(
          switchMap(() => this.updates$.pipe(take(1))),
          map(
            (previousMovements) =>
              [movement, previousMovements] as PairwiseMovement
          )
        );
      }),
      tap(([movement, previousMovements]) => {
        this.moving.delete(movement.vehicle.id);
        this.updates$.next([
          ...previousMovements,
          { ...movement, arrived: true },
        ]);
        this.vehicles.update((vehicles) => {
          vehicles[movement.vehicle.id].currentLocation = (
            movement as MovementUpdate
          ).movement.location;
          return vehicles;
        });
      })
    )
    .subscribe();

  ngOnDestroy(): void {
    this.movementSub.unsubscribe();
  }

  updateMovement(previous: (typeof LOCATIONS)[number], vehicleIdx: number) {
    const movement = getRandomMovement(previous);
    this.vehicleMovement$.next({
      vehicle: this.vehicles()[vehicleIdx],
      movement,
    });
  }

  fixProblem(error: VehicleMovementError) {
    this.errors.delete(error.vehicle.id);
    this.vehicleMovement$.next({ ...error.previousMovement });
  }

  getUpdateLabel(movement: MovementUpdate | VehicleMovementError) {
    if ("movement" in movement) {
      if ("arrived" in movement)
        return `${movement.vehicle.name} has moved to ${movement.movement.location}`;
      return `${movement.vehicle.name} is currently moving to ${movement.movement.location}`;
    }
    return `${movement.vehicle.name} has experienced a problem: ${movement.problem}`;
  }

  // getRuntime(future: Date) {
  //   return (Date.now() / future.getTime()) * 100;
  // }
}

function getRandomError(): MovementError {
  const randIdx = Math.floor(Math.random() * MOVEMENT_ERRORS.length);
  return MOVEMENT_ERRORS[randIdx];
}

function getRandomMovement(
  previous: (typeof LOCATIONS)[number],
  timeRange?: number
): VehicleMovement {
  let randIdx = getRandomLocIndex();
  let current = LOCATIONS[randIdx];
  while (current === previous) {
    current = LOCATIONS[getRandomLocIndex()];
  }

  // const time = new Date();
  // time.setSeconds(
  //   time.getSeconds() + (timeRange ?? Math.round(Math.random() * 5000))
  // );

  return {
    location: current,
    time: timeRange ?? Math.round(Math.random() * 5000),
  };
}

function getRandomLocIndex() {
  return Math.floor(Math.random() * LOCATIONS.length);
}

type PairwiseMovement = [
  MovementUpdate | VehicleMovementError,
  (MovementUpdate | (MovementUpdate & { arrived: boolean }))[]
];
