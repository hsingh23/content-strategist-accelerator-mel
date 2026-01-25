import { BusinessContext, GeneratedResult } from '../types';

const DB_NAME = 'CS_Accelerator_DB';
const DB_VERSION = 1;
const STORE_CONTEXT = 'context';
const STORE_HISTORY = 'history';

// Helper to open the database
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error("IndexedDB is not supported in this browser."));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_CONTEXT)) {
        db.createObjectStore(STORE_CONTEXT, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_HISTORY)) {
        db.createObjectStore(STORE_HISTORY, { keyPath: 'id' });
      }
    };
  });
};

export const saveContext = async (context: BusinessContext): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CONTEXT, 'readwrite');
    const store = tx.objectStore(STORE_CONTEXT);
    // We only support one active context for this app, so clear old ones first
    store.clear(); 
    store.add(context);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const getContext = async (): Promise<BusinessContext | null> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CONTEXT, 'readonly');
    const store = tx.objectStore(STORE_CONTEXT);
    const request = store.getAll();
    request.onsuccess = () => {
      const results = request.result;
      resolve(results.length > 0 ? results[0] : null);
    };
    request.onerror = () => reject(request.error);
  });
};

export const saveResult = async (result: GeneratedResult): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_HISTORY, 'readwrite');
    const store = tx.objectStore(STORE_HISTORY);
    store.add(result);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const getHistory = async (): Promise<GeneratedResult[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_HISTORY, 'readonly');
    const store = tx.objectStore(STORE_HISTORY);
    const request = store.getAll();
    request.onsuccess = () => {
      // Sort by timestamp descending
      const sorted = request.result.sort((a, b) => b.timestamp - a.timestamp);
      resolve(sorted);
    };
    request.onerror = () => reject(request.error);
  });
};

export const deleteResult = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_HISTORY, 'readwrite');
    const store = tx.objectStore(STORE_HISTORY);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const clearData = async (): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_CONTEXT, STORE_HISTORY], 'readwrite');
    tx.objectStore(STORE_CONTEXT).clear();
    tx.objectStore(STORE_HISTORY).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};