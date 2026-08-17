import { HttpClient, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { carListQueryToHttpParams } from '../lib/car-list-query';
import type { Car, CarListQuery, CarListResponse, CreateCarInput } from '../models/car';

@Injectable({ providedIn: 'root' })
export class CarsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  list(query: CarListQuery): Observable<CarListResponse> {
    return this.http.get<CarListResponse>(`${this.apiUrl}/cars`, {
      params: carListQueryToHttpParams(query),
    });
  }

  create(input: CreateCarInput): Observable<{ data: Car }> {
    return this.http.post<{ data: Car }>(`${this.apiUrl}/cars`, input);
  }

  exportCsv(query: CarListQuery): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.apiUrl}/cars/export`, {
      params: carListQueryToHttpParams(query),
      responseType: 'blob',
      observe: 'response',
    });
  }
}
