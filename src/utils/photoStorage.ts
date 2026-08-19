const DB_NAME = 'x-porta-photos';
const DB_VERSION = 1;
const STORE_NAME = 'photos';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'reportId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export interface PhotoStore {
  reportId: string;
  attachments: Array<{
    id: string;
    description: string;
    dataUrl: string;
    fileName: string;
    width: number;
    height: number;
    sizeBytes: number;
    createdAt: string;
  }>;
}

export async function savePhotos(reportId: string, attachments: PhotoStore['attachments']): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put({ reportId, attachments });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPhotos(reportId: string): Promise<PhotoStore['attachments']> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(reportId);
    request.onsuccess = () => resolve(request.result?.attachments ?? []);
    request.onerror = () => reject(request.error);
  });
}

export async function deletePhotos(reportId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(reportId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllPhotos(): Promise<Map<string, PhotoStore['attachments']>> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => {
      const map = new Map<string, PhotoStore['attachments']>();
      for (const item of request.result ?? []) {
        map.set(item.reportId, item.attachments);
      }
      resolve(map);
    };
    request.onerror = () => reject(request.error);
  });
}
