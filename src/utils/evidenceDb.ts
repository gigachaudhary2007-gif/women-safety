/**
 * IndexedDB Persistent Storage for Evidence Blobs (Video & Audio)
 * Ensures recordings survive screen navigation, browser restarts, and memory clearing.
 */

const DB_NAME = 'SafeJourneyEvidenceDB';
const DB_VERSION = 1;
const STORE_NAME = 'evidence_blobs';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not supported on this platform.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export interface StoredBlobRecord {
  id: string;
  blob: Blob;
  mimeType: string;
  fileSizeBytes: number;
  timestamp: string;
}

/**
 * Persist a video or audio Blob directly to IndexedDB
 */
export async function saveEvidenceBlobToDb(id: string, blob: Blob, mimeType: string): Promise<boolean> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      const record: StoredBlobRecord = {
        id,
        blob,
        mimeType,
        fileSizeBytes: blob.size,
        timestamp: new Date().toISOString(),
      };

      const putRequest = store.put(record);
      putRequest.onsuccess = () => resolve(true);
      putRequest.onerror = (err) => {
        console.warn('Failed to save blob to IndexedDB:', err);
        resolve(false);
      };
    });
  } catch (err) {
    console.warn('IndexedDB unavailable, falling back:', err);
    return false;
  }
}

/**
 * Retrieve a persisted Blob from IndexedDB by evidence ID
 */
export async function getEvidenceBlobFromDb(id: string): Promise<Blob | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const result = getRequest.result as StoredBlobRecord | undefined;
        resolve(result?.blob || null);
      };
      getRequest.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Delete a persisted Blob from IndexedDB
 */
export async function deleteEvidenceBlobFromDb(id: string): Promise<boolean> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const delRequest = store.delete(id);

      delRequest.onsuccess = () => resolve(true);
      delRequest.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}
