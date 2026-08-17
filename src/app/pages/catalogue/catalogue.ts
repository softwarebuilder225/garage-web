import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { CarsService } from '../../services/cars.service';
import { ORIGIN_LABELS, type Car } from '../../models/car';

@Component({
  selector: 'app-catalogue',
  imports: [MatTableModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './catalogue.html',
  styleUrl: './catalogue.scss',
})
export class Catalogue {
  private readonly carsService = inject(CarsService);

  readonly displayedColumns = [
    'name',
    'modelYear',
    'origin',
    'mpg',
    'cylinders',
    'horsepower',
    'weight',
    'acceleration',
  ] as const;

  readonly cars = signal<Car[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  constructor() {
    this.loadCars();
  }

  originLabel(origin: Car['origin']): string {
    return ORIGIN_LABELS[origin] ?? origin;
  }

  formatNumber(value: number | null): string {
    return value === null ? '—' : String(value);
  }

  loadCars(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.carsService.list().subscribe({
      next: (response) => {
        this.cars.set(response.data);
        this.total.set(response.total);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.cars.set([]);
        this.total.set(0);
        this.loading.set(false);
        this.errorMessage.set(this.readErrorMessage(error));
      },
    });
  }

  private readErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const apiError = error.error as { error?: string } | null;

      if (apiError?.error) {
        return apiError.error;
      }

      if (error.status === 0) {
        return 'Cannot reach the server. Please make sure the API is running, then try again.';
      }
    }

    return 'Something went wrong while loading your cars. Please try again.';
  }
}
