import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { carListQueryToHttpParams } from '../lib/car-list-query';
import type { CarListQuery, CarListResponse } from '../models/car';

@Injectable({ providedIn: 'root' })
export class CarsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  list(query: CarListQuery): Observable<CarListResponse> {
    return this.http.get<CarListResponse>(`${this.apiUrl}/cars`, {
      params: carListQueryToHttpParams(query),
    });
  }
}
