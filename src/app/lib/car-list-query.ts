import { HttpParams } from '@angular/common/http';
import { ParamMap } from '@angular/router';
import {
  CAR_ORIGINS,
  DEFAULT_CAR_LIST_QUERY,
  SORT_FIELDS,
  type CarListQuery,
  type CarOrigin,
  type CarSortField,
  type SortOrder,
} from '../models/car';

function optionalNumber(value: string | number | null | undefined): number | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }

  const number = typeof value === 'number' ? value : Number(String(value).trim());
  return Number.isFinite(number) ? number : undefined;
}

function isOrigin(value: string): value is CarOrigin {
  return (CAR_ORIGINS as string[]).includes(value);
}

function isSortField(value: string): value is CarSortField {
  return (SORT_FIELDS as string[]).includes(value);
}

export function parseCarListQuery(params: ParamMap): CarListQuery {
  const origin = params.get('origin')?.toLowerCase() ?? '';
  const sort = params.get('sort') ?? DEFAULT_CAR_LIST_QUERY.sort;
  const order = params.get('order') ?? DEFAULT_CAR_LIST_QUERY.order;

  return {
    q: params.get('q')?.trim() ?? '',
    origin: isOrigin(origin) ? origin : undefined,
    cylinders: optionalNumber(params.get('cylinders')),
    minYear: optionalNumber(params.get('minYear')),
    maxYear: optionalNumber(params.get('maxYear')),
    minMpg: optionalNumber(params.get('minMpg')),
    maxMpg: optionalNumber(params.get('maxMpg')),
    sort: isSortField(sort) ? sort : DEFAULT_CAR_LIST_QUERY.sort,
    order: order === 'desc' ? 'desc' : 'asc',
  };
}

export function carListQueryToParams(query: CarListQuery): Record<string, string> {
  const params: Record<string, string> = {};

  if (query.q) {
    params['q'] = query.q;
  }
  if (query.origin) {
    params['origin'] = query.origin;
  }
  if (query.cylinders !== undefined) {
    params['cylinders'] = String(query.cylinders);
  }
  if (query.minYear !== undefined) {
    params['minYear'] = String(query.minYear);
  }
  if (query.maxYear !== undefined) {
    params['maxYear'] = String(query.maxYear);
  }
  if (query.minMpg !== undefined) {
    params['minMpg'] = String(query.minMpg);
  }
  if (query.maxMpg !== undefined) {
    params['maxMpg'] = String(query.maxMpg);
  }
  if (query.sort !== DEFAULT_CAR_LIST_QUERY.sort) {
    params['sort'] = query.sort;
  }
  if (query.order !== DEFAULT_CAR_LIST_QUERY.order) {
    params['order'] = query.order;
  }

  return params;
}

export function carListQueryToHttpParams(query: CarListQuery): HttpParams {
  let params = new HttpParams()
    .set('sort', query.sort)
    .set('order', query.order);

  const extras = carListQueryToParams({ ...query, sort: DEFAULT_CAR_LIST_QUERY.sort, order: DEFAULT_CAR_LIST_QUERY.order });

  for (const [key, value] of Object.entries(extras)) {
    params = params.set(key, value);
  }

  return params;
}

export function hasActiveFilters(query: CarListQuery): boolean {
  return Boolean(
    query.q ||
      query.origin ||
      query.cylinders !== undefined ||
      query.minYear !== undefined ||
      query.maxYear !== undefined ||
      query.minMpg !== undefined ||
      query.maxMpg !== undefined,
  );
}

export function sameCarListQuery(left: CarListQuery, right: CarListQuery): boolean {
  return JSON.stringify(carListQueryToParams(left)) === JSON.stringify(carListQueryToParams(right));
}

export function queryFromFormValue(value: {
  q: string;
  origin: string;
  cylinders: string | number;
  minYear: string | number;
  maxYear: string | number;
  minMpg: string | number;
  maxMpg: string | number;
}, sort: CarSortField, order: SortOrder): CarListQuery {
  const origin = value.origin.toLowerCase();

  return {
    q: value.q.trim(),
    origin: isOrigin(origin) ? origin : undefined,
    cylinders: optionalNumber(value.cylinders),
    minYear: optionalNumber(value.minYear),
    maxYear: optionalNumber(value.maxYear),
    minMpg: optionalNumber(value.minMpg),
    maxMpg: optionalNumber(value.maxMpg),
    sort,
    order,
  };
}
