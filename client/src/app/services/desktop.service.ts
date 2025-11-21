import { Injectable } from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {BehaviorSubject, Observable, tap, map, catchError, of, throwError} from 'rxjs';
import { Item, ApiResponse } from '../models/item.model';

@Injectable({
  providedIn: 'root'
})
export class DesktopService {
  private apiUrl = '/api/v1/items'; // Forcer localhost en développement
  // private apiUrl = '/api/v1/items'; // URL relative pour la production
  private itemsSubject = new BehaviorSubject<Item[]>([]);
  public items$ = this.itemsSubject.asObservable();

  constructor(private http: HttpClient) {
    // Charger les éléments initiaux
    this.loadItems();
    
    // Rafraîchir périodiquement (toutes les 5 secondes) pour détecter les changements
    setInterval(() => this.loadItems(), 5000);
  }

  loadItems(): void {
    console.log('Chargement des éléments...');
    this.getItemsInPath('/').subscribe({
      next: (items) => {
        console.log(`${items.length} éléments chargés`);
        this.itemsSubject.next(items);
      },
      error: (err) => console.error('Erreur lors du chargement des items:', err)
    });
  }


  getItemsInPath(path: string = '/'): Observable<Item[]> {
    console.log('Chargement des éléments depuis le chemin:', path);
    return this.http.get<ApiResponse<{ items: Item[] }>>(this.apiUrl).pipe(
      map((response) => {
        if (response?.data?.items && Array.isArray(response.data.items)) {
          // S'assurer que chaque élément a des valeurs par défaut pour x et y
          const items = response.data.items.map((item: Item) => ({
            ...item,
            x: item.x ?? Math.floor(Math.random() * 500),
            y: item.y ?? Math.floor(Math.random() * 300)
          }));
          console.log('Éléments chargés avec positions:', items.map(i => `${i.name}: (${i.x}, ${i.y})`));
          return items;
        }
        console.warn('Aucun élément trouvé ou format de réponse inattendu:', response);
        return [];
      }),
      catchError(error => {
        console.error('Erreur lors du chargement des éléments:', error);
        return of([]);
      })
    );
  }

  getItemById(id: string): Observable<Item> {
    return this.http.get<ApiResponse<{ item: Item }>>(`${this.apiUrl}/${id}`).pipe(
      map(response => response.data.item)
    );
  }

  createFolder(name: string, parentId: string | null = null, x: number = 0, y: number = 0): Observable<Item> {
    console.log(`Création du dossier: ${name}, parent: ${parentId}`);
    return this.http.post<ApiResponse<{ folder: Item }>>(`${this.apiUrl}/folders`, {
      name,
      parentId,
      x,
      y,
      type: 'folder'
    }).pipe(
      tap(response => {
        console.log('Réponse de création de dossier:', response);
        // Au lieu de mettre à jour manuellement, on recharge la liste complète
        // pour s'assurer d'avoir les données les plus récentes
        this.loadItems();
      }),
      map(response => response.data.folder),
      catchError(error => {
        console.error('Erreur lors de la création du dossier:', error);
        return throwError(() => error);
      })
    );
  }

  createFile(name: string, parentId: string | null = null, x: number = 0, y: number = 0, content: string = '', mimeType: string = 'text/plain'): Observable<Item> {
    console.log(`Création du fichier: ${name}, parent: ${parentId}`);
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
        console.log('Réponse de création de fichier:', response);
        // Recharger la liste complète pour s'assurer d'avoir les données les plus récentes
        this.loadItems();
      }),
      map(response => response.data.file),
      catchError(error => {
        console.error('Erreur lors de la création du fichier:', error);
        return throwError(() => error);
      })
    );
  }

  updateItemPosition(itemId: string, x: number, y: number): Observable<Item> {
    console.log(`Mise à jour de la position de l'élément ${itemId} vers (${x}, ${y})`);
    
    return this.http.patch<ApiResponse<{ item: Item }>>(
      `${this.apiUrl}/${itemId}/position`,
      { x, y }
    ).pipe(
      tap(response => {
        console.log('Réponse de la mise à jour de position:', response);
        if (response && response.data && response.data.item) {
          const updatedItem = response.data.item;
          const currentItems = this.itemsSubject.value;
          const index = currentItems.findIndex(item => item.id === itemId);
          
          if (index !== -1) {
            // Mettre à jour l'élément avec les données du serveur
            const updatedItems = [...currentItems];
            updatedItems[index] = { 
              ...updatedItems[index], 
              ...updatedItem,
              x: typeof updatedItem.x === 'number' ? updatedItem.x : x,
              y: typeof updatedItem.y === 'number' ? updatedItem.y : y
            };
            this.itemsSubject.next(updatedItems);
            console.log('Liste des items mise à jour avec la nouvelle position');
          } else {
            console.warn(`L'élément avec l'ID ${itemId} n'a pas été trouvé dans la liste actuelle`);
          }
        }
      }),
      map(response => response.data.item)
    );
  }

  // Supprimer un élément
  deleteItem(itemId: string): Observable<void> {
    // Ajouter un timestamp pour éviter le cache
    const timestamp = new Date().getTime();
    const deleteUrl = `${this.apiUrl}/${itemId}?_=${timestamp}`;
    
    return new Observable(subscriber => {
      this.http.delete(deleteUrl, { 
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        observe: 'response'
      }).subscribe({
        next: (response) => {
          if (response.status === 204 || response.status === 200) {
            const currentItems = this.itemsSubject.value;
            this.itemsSubject.next(currentItems.filter(item => item.id !== itemId));
            subscriber.next();
            subscriber.complete();
          } else {
            subscriber.error(new Error(`Erreur inattendue: ${response.status} ${response.statusText}`));
          }
        },
        error: (error) => {
          subscriber.error(error);
        }
      });
    });
  }

  // Déplacer un élément vers un autre dossier
  moveItem(itemId: string, targetParentId: string | null): Observable<Item> {
    const url = `${this.apiUrl}/${itemId}/move`;
    const body = { targetParentId };
    
    console.log(`Déplacement de l'élément ${itemId} vers le parent ${targetParentId || 'root'}`);
    console.log('URL:', url);
    console.log('Corps de la requête:', body);
    
    return this.http.patch<ApiResponse<{ item: Item }>>(url, body, {
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json'
      }
    }).pipe(
      tap(response => {
        console.log('Réponse du serveur (moveItem):', response);
      }),
      map(response => {
        if (!response) {
          throw new Error('Réponse du serveur vide');
        }
        
        if (!response.data || !response.data.item) {
          console.error('Réponse du serveur invalide, données manquantes:', response);
          throw new Error('Réponse du serveur invalide: données manquantes');
        }
        
        // Mettre à jour la liste locale
        const updatedItem = response.data.item;
        const currentItems = this.itemsSubject.value;
        console.log('Liste actuelle des items:', currentItems);
        
        const updatedItems = currentItems.map(item => 
          item.id === updatedItem.id ? updatedItem : item
        );
        
        console.log('Nouvelle liste des items après mise à jour:', updatedItems);
        this.itemsSubject.next(updatedItems);
        return updatedItem;
      }),
      catchError(error => {
        console.error('Erreur lors du déplacement de l\'élément:', error);
        return throwError(() => error);
      })
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
