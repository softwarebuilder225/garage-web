export type CarOrigin = 'usa' | 'europe' | 'japan';

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

export const ORIGIN_LABELS: Record<CarOrigin, string> = {
  usa: 'USA',
  europe: 'Europe',
  japan: 'Japan',
};
