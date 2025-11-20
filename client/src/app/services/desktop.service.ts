import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, map } from 'rxjs';
import { Item, ApiResponse } from '../models/item.model';

@Injectable({
  providedIn: 'root'
})
export class DesktopService {
  private apiUrl = '/api/v1/items';
  private itemsSubject = new BehaviorSubject<Item[]>([]);
  public items$ = this.itemsSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadItems();
  }

  loadItems(): void {
    this.getItemsInPath('/').subscribe({
      next: (items) => {
        console.log('Items chargés depuis l\'API:', items);
        this.itemsSubject.next(items);
      },
      error: (err) => console.error('Erreur lors du chargement des items:', err)
    });
  }

  getItemsInPath(path: string = '/'): Observable<Item[]> {
    return this.http.get<any>(`${this.apiUrl}`).pipe(
      map((response: any) => {
        if (response?.data?.items && Array.isArray(response.data.items)) {
          return response.data.items;
        }
        return [];
      })
    );
  }

  getItemById(id: string): Observable<Item> {
    return this.http.get<ApiResponse<{ item: Item }>>(`${this.apiUrl}/${id}`).pipe(
      map(response => response.data.item)
    );
  }

  createFolder(name: string, parentId: string | null = null, x: number = 0, y: number = 0): Observable<Item> {
    return this.http.post<ApiResponse<{ folder: Item }>>(`${this.apiUrl}/folders`, {
      name,
      parentId,
      x,
      y,
      type: 'folder'
    }).pipe(
      tap(response => {
        console.log('Dossier créé:', response.data.folder);
        // Ajouter au cache local immédiatement
        const currentItems = this.itemsSubject.value;
        const folder = response.data.folder;
        const existingIndex = currentItems.findIndex(item => item.id === folder.id);
        if (existingIndex >= 0) {
          currentItems[existingIndex] = folder;
        } else {
          currentItems.push(folder);
        }
        this.itemsSubject.next([...currentItems]);
      }),
      map(response => response.data.folder)
    );
  }

  createFile(name: string, parentId: string | null = null, x: number = 0, y: number = 0, content: string = '', mimeType: string = 'text/plain'): Observable<Item> {
    return this.http.post<ApiResponse<{ file: Item }>>(`${this.apiUrl}/files/create`, {
      name,
      parentId,
      x,
      y,
      content,
      mimeType,
      type: 'file',
      size: content.length
    }).pipe(
      tap(response => {
        console.log('Fichier créé:', response.data.file);
        // Ajouter au cache local immédiatement
        const currentItems = this.itemsSubject.value;
        const file = response.data.file;
        const existingIndex = currentItems.findIndex(item => item.id === file.id);
        if (existingIndex >= 0) {
          currentItems[existingIndex] = file;
        } else {
          currentItems.push(file);
        }
        this.itemsSubject.next([...currentItems]);
      }),
      map(response => response.data.file)
    );
  }

  updateItemPosition(itemId: string, x: number, y: number): Observable<Item> {
    return this.http.patch<ApiResponse<{ item: Item }>>(`${this.apiUrl}/${itemId}/position`, { x, y }).pipe(
      tap(response => {
        const currentItems = this.itemsSubject.value;
        const index = currentItems.findIndex(item => item.id === itemId);
        if (index !== -1) {
          currentItems[index] = { ...currentItems[index], x, y };
          this.itemsSubject.next([...currentItems]);
        }
      }),
      map(response => response.data.item)
    );
  }

  deleteItem(itemId: string): Observable<void> {
    return this.http.delete<any>(`${this.apiUrl}/${itemId}`).pipe(
      tap((response) => {
        console.log('Item supprimé:', response);
        // Retirer du cache local immédiatement
        const currentItems = this.itemsSubject.value;
        this.itemsSubject.next(currentItems.filter(item => item.id !== itemId));
      }),
      map(() => undefined)
    );
  }

  moveItem(itemId: string, targetPath: string): Observable<Item> {
    return this.http.patch<ApiResponse<{ item: Item }>>(`${this.apiUrl}/${itemId}/move`, { targetPath }).pipe(
      tap(() => {
        this.loadItems();
      }),
      map(response => response.data.item)
    );
  }

  uploadFile(file: File, parentId: string | null = null): Observable<Item> {
    const formData = new FormData();
    formData.append('file', file);
    if (parentId) {
      formData.append('parentId', parentId);
    }
    return this.http.post<ApiResponse<{ file: Item }>>(`${this.apiUrl}/files`, formData).pipe(
      tap(response => {
        const currentItems = this.itemsSubject.value;
        this.itemsSubject.next([...currentItems, response.data.file]);
      }),
      map(response => response.data.file)
    );
  }
}
