import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class Clima {
  private apiUrl = 'https://api.open-meteo.com/v1/forecast';

  constructor(private http: HttpClient) {}

  /**
   * Obtiene el clima actual
   * Coordenadas por defecto: Puente Alto (-33.6117, -70.5758)
   */
  obtenerClimaActual(latitud: number = -33.6117, longitud: number = -70.5758): Observable<any> {
    const url = `${this.apiUrl}?latitude=${latitud}&longitude=${longitud}&current_weather=true&timezone=auto`;
    return this.http.get(url);
  }
}