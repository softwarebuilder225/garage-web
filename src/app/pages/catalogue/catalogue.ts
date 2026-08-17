import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime } from 'rxjs';
import {
  carListQueryToParams,
  hasActiveFilters,
  parseCarListQuery,
  queryFromFormValue,
  sameCarListQuery,
} from '../../lib/car-list-query';
import {
  CAR_ORIGINS,
  CYLINDER_OPTIONS,
  DEFAULT_CAR_LIST_QUERY,
  ORIGIN_LABELS,
  type Car,
  type CarListQuery,
  type CreateCarInput,
  type CarSortField,
} from '../../models/car';
import { CarsService } from '../../services/cars.service';

type AddCarField =
  | 'name'
  | 'mpg'
  | 'cylinders'
  | 'displacement'
  | 'horsepower'
  | 'weight'
  | 'acceleration'
  | 'modelYear'
  | 'origin';

@Component({
  selector: 'app-catalogue',
  imports: [
    ReactiveFormsModule,
    MatTableModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './catalogue.html',
  styleUrl: './catalogue.scss',
})
export class Catalogue {
  private readonly carsService = inject(CarsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly origins = CAR_ORIGINS;
  readonly cylinderOptions = CYLINDER_OPTIONS;
  readonly originLabels = ORIGIN_LABELS;

  readonly displayedColumns = [
    'name',
    'modelYear',
    'origin',
    'mpg',
    'cylinders',
    'horsepower',
    'weight',
    'acceleration',
  ];

  readonly filterForm = this.formBuilder.nonNullable.group({
    q: [''],
    origin: [''],
    cylinders: [''],
    minYear: [''],
    maxYear: [''],
    minMpg: [''],
    maxMpg: [''],
  });

  readonly addCarForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    mpg: [''],
    cylinders: ['4', [Validators.required]],
    displacement: ['', [Validators.required]],
    horsepower: [''],
    weight: ['', [Validators.required]],
    acceleration: ['', [Validators.required]],
    modelYear: ['', [Validators.required]],
    origin: ['usa', [Validators.required]],
  });

  readonly filters = signal<CarListQuery>({ ...DEFAULT_CAR_LIST_QUERY });
  readonly cars = signal<Car[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly savingCar = signal(false);
  readonly downloadingCsv = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly addCarMessage = signal<string | null>(null);
  readonly addCarError = signal<string | null>(null);
  readonly downloadError = signal<string | null>(null);

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const query = parseCarListQuery(params);
      this.filters.set(query);
      this.patchForm(query);
      this.loadCars(query);
    });

    this.filterForm.valueChanges
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.writeFiltersToUrl());
  }

  originLabel(origin: Car['origin']): string {
    return ORIGIN_LABELS[origin] ?? origin;
  }

  formatNumber(value: number | null): string {
    return value === null ? '-' : String(value);
  }

  formatWeight(value: number): string {
    return new Intl.NumberFormat('en-US').format(value);
  }

  displayName(name: string): string {
    return name.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
  }

  filtersActive(): boolean {
    return hasActiveFilters(this.filters());
  }

  onSort(sort: Sort): void {
    const current = this.filters();
    const next: CarListQuery = {
      ...current,
      sort: (sort.active as CarSortField) || DEFAULT_CAR_LIST_QUERY.sort,
      order: sort.direction === 'desc' ? 'desc' : 'asc',
    };

    if (!sort.direction) {
      next.sort = DEFAULT_CAR_LIST_QUERY.sort;
      next.order = DEFAULT_CAR_LIST_QUERY.order;
    }

    this.navigate(next);
  }

  clearFilters(): void {
    this.navigate({
      ...DEFAULT_CAR_LIST_QUERY,
      sort: this.filters().sort,
      order: this.filters().order,
    });
  }

  retry(): void {
    this.loadCars(this.filters());
  }

  downloadCsv(): void {
    this.downloadingCsv.set(true);
    this.downloadError.set(null);

    this.carsService.exportCsv(this.filters()).subscribe({
      next: (response) => {
        this.downloadingCsv.set(false);
        const blob = response.body;

        if (!blob) {
          this.downloadError.set('Download was empty.');
          return;
        }

        if (blob.type.includes('application/json')) {
          void blob.text().then((text) => {
            try {
              const parsed = JSON.parse(text) as { error?: string };
              this.downloadError.set(
                this.publicError(parsed.error ?? '', 'Could not download CSV.'),
              );
            } catch {
              this.downloadError.set('Could not download CSV.');
            }
          });
          return;
        }

        this.saveFile(blob, this.filenameFromResponse(response.headers.get('Content-Disposition')));
      },
      error: (error: unknown) => {
        this.downloadingCsv.set(false);

        if (error instanceof HttpErrorResponse && error.error instanceof Blob) {
          void error.error.text().then((text) => {
            try {
              const parsed = JSON.parse(text) as { error?: string };
              this.downloadError.set(
                this.publicError(parsed.error ?? '', 'Could not download CSV.'),
              );
            } catch {
              this.downloadError.set(this.readDownloadErrorMessage(error));
            }
          });
          return;
        }

        this.downloadError.set(this.readDownloadErrorMessage(error));
      },
    });
  }

  submitCar(): void {
    if (this.addCarForm.invalid) {
      this.addCarForm.markAllAsTouched();
      return;
    }

    this.savingCar.set(true);
    this.addCarMessage.set(null);
    this.addCarError.set(null);

    this.carsService.create(this.createCarPayload()).subscribe({
      next: () => {
        this.savingCar.set(false);
        this.addCarMessage.set('Car added.');
        this.addCarForm.reset({
          name: '',
          mpg: '',
          cylinders: '4',
          displacement: '',
          horsepower: '',
          weight: '',
          acceleration: '',
          modelYear: '',
          origin: 'usa',
        });
        this.loadCars(this.filters());
      },
      error: (error: unknown) => {
        this.savingCar.set(false);
        this.addCarError.set(this.readCreateErrorMessage(error));
      },
    });
  }

  fieldHasError(controlName: AddCarField): boolean {
    const control = this.addCarForm.controls[controlName];
    return control.invalid && (control.touched || control.dirty);
  }

  fieldError(controlName: AddCarField): string {
    const control = this.addCarForm.controls[controlName];

    if (control.hasError('required')) {
      switch (controlName) {
        case 'name':
          return 'Car name is required.';
        case 'cylinders':
          return 'Cylinders is required.';
        case 'displacement':
          return 'Engine size is required.';
        case 'weight':
          return 'Weight is required.';
        case 'acceleration':
          return 'Acceleration is required.';
        case 'modelYear':
          return 'Year is required.';
        case 'origin':
          return 'Origin is required.';
        default:
          return 'This field is required.';
      }
    }

    if (control.hasError('maxlength')) {
      return 'Car name is too long.';
    }

    return 'Check this field.';
  }

  private patchForm(query: CarListQuery): void {
    this.filterForm.patchValue(
      {
        q: query.q,
        origin: query.origin ?? '',
        cylinders: query.cylinders === undefined ? '' : String(query.cylinders),
        minYear: query.minYear === undefined ? '' : String(query.minYear),
        maxYear: query.maxYear === undefined ? '' : String(query.maxYear),
        minMpg: query.minMpg === undefined ? '' : String(query.minMpg),
        maxMpg: query.maxMpg === undefined ? '' : String(query.maxMpg),
      },
      { emitEvent: false },
    );
  }

  private writeFiltersToUrl(): void {
    const current = this.filters();
    const next = queryFromFormValue(this.filterForm.getRawValue(), current.sort, current.order);

    if (!sameCarListQuery(current, next)) {
      this.navigate(next);
    }
  }

  private navigate(query: CarListQuery): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: carListQueryToParams(query),
      replaceUrl: true,
    });
  }

  private loadCars(query: CarListQuery): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.carsService.list(query).subscribe({
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

  private createCarPayload(): CreateCarInput {
    const value = this.addCarForm.getRawValue();

    return {
      name: value.name.trim(),
      mpg: value.mpg === '' ? null : Number(value.mpg),
      cylinders: Number(value.cylinders),
      displacement: Number(value.displacement),
      horsepower: value.horsepower === '' ? null : Number(value.horsepower),
      weight: Number(value.weight),
      acceleration: Number(value.acceleration),
      modelYear: Number(value.modelYear),
      origin: value.origin as CreateCarInput['origin'],
    };
  }

  private readErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const apiError = error.error as { error?: string } | null;

      if (apiError?.error) {
        return this.publicError(apiError.error, 'Could not load cars.');
      }

      if (error.status === 0) {
        return 'Could not reach the API.';
      }
    }

    return 'Could not load cars.';
  }

  private readCreateErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const apiError = error.error as
        | { error?: string; details?: Record<string, string[]> }
        | null;

      if (apiError?.details) {
        const firstFieldError = Object.values(apiError.details)[0]?.[0];
        if (firstFieldError) {
          return firstFieldError;
        }
      }

      if (apiError?.error) {
        return this.publicError(apiError.error, 'Could not save the car.');
      }

      if (error.status === 0) {
        return 'Could not reach the API.';
      }
    }

    return 'Could not save the car.';
  }

  private readDownloadErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return 'Could not reach the API.';
      }

      const apiError = error.error as { error?: string } | Blob | null;

      if (apiError && typeof apiError === 'object' && 'error' in apiError && apiError.error) {
        return this.publicError(apiError.error, 'Could not download CSV.');
      }
    }

    return 'Could not download CSV.';
  }

  // Don't show Firestore / credential noise in the UI.
  private publicError(message: string, fallback: string): string {
    const lower = message.toLowerCase();

    if (
      lower.includes('firestore') ||
      lower.includes('permission_denied') ||
      lower.includes('npm run') ||
      lower.includes('service account')
    ) {
      return fallback;
    }

    return message || fallback;
  }

  private filenameFromResponse(header: string | null): string {
    const match = header?.match(/filename="?([^"]+)"?/i);
    return match?.[1] ?? `johns-garage-cars-${new Date().toISOString().slice(0, 10)}.csv`;
  }

  private saveFile(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }
}
