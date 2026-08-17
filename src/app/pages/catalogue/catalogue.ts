import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
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
  type CarSortField,
} from '../../models/car';
import { CarsService } from '../../services/cars.service';

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

  readonly filters = signal<CarListQuery>({ ...DEFAULT_CAR_LIST_QUERY });
  readonly cars = signal<Car[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);

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
    return value === null ? '—' : String(value);
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
