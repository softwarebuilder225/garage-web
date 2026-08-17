export type CarOrigin = 'usa' | 'europe' | 'japan';

export type CarSortField =
  | 'name'
  | 'mpg'
  | 'cylinders'
  | 'displacement'
  | 'horsepower'
  | 'weight'
  | 'acceleration'
  | 'modelYear'
  | 'origin';

export type SortOrder = 'asc' | 'desc';

export interface Car {
  id: string;
  name: string;
  mpg: number | null;
  cylinders: number;
  displacement: number;
  horsepower: number | null;
  weight: number;
  acceleration: number;
  modelYear: number;
  origin: CarOrigin;
  createdAt: string;
}

export interface CarListResponse {
  data: Car[];
  total: number;
}

export interface CarListQuery {
  q: string;
  origin?: CarOrigin;
  cylinders?: number;
  minYear?: number;
  maxYear?: number;
  minMpg?: number;
  maxMpg?: number;
  sort: CarSortField;
  order: SortOrder;
}

export interface CreateCarInput {
  name: string;
  mpg: number | null;
  cylinders: number;
  displacement: number;
  horsepower: number | null;
  weight: number;
  acceleration: number;
  modelYear: number;
  origin: CarOrigin;
}

export const ORIGIN_LABELS: Record<CarOrigin, string> = {
  usa: 'USA',
  europe: 'Europe',
  japan: 'Japan',
};

export const DEFAULT_CAR_LIST_QUERY: CarListQuery = {
  q: '',
  sort: 'name',
  order: 'asc',
};

export const CAR_ORIGINS: CarOrigin[] = ['usa', 'europe', 'japan'];
export const CYLINDER_OPTIONS = [3, 4, 5, 6, 8];
export const SORT_FIELDS: CarSortField[] = [
  'name',
  'mpg',
  'cylinders',
  'displacement',
  'horsepower',
  'weight',
  'acceleration',
  'modelYear',
  'origin',
];
