import { Routes } from '@angular/router';
import { Catalogue } from './pages/catalogue/catalogue';

export const routes: Routes = [
  { path: '', component: Catalogue },
  { path: '**', redirectTo: '' },
];
