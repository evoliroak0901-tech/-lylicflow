import { LyricSegment } from '../types';

const DB_NAME = 'LyricFlowDB';
const DB_VERSION = 2; // Incremented version
const STORE_NAME = 'projectState';
const KEY_MEDIA = 'project_media';
const KEY_DATA = 'project_data';

export interface ProjectState {
  audioBlob: Blob | null;
  audioName?: string;
  imageBlobs: Blob[];
  lyrics: LyricSegment[];
  timestamp: number;
}

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
        reject(new Error("IndexedDB not supported"));
        return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Save ONLY heavy media files (Call this only on upload/change)
export const saveMedia = async (
    audioFile: File | null, 
    imageFiles: Blob[]
) => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    
    // Create a copy of the file to ensure stability
    const stableAudio = audioFile 
        ? new File([audioFile], audioFile.name, { type: audioFile.type }) 
        : null;

    store.put({
        audioBlob: stableAudio,
        audioName: stableAudio?.name,
        imageBlobs: imageFiles
    }, KEY_MEDIA);
    
    return new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => {
            db.close();
            resolve();
        };
        tx.onerror = () => {
            db.close();
            reject(tx.error);
        };
    });
  } catch (e) {
    console.warn("Failed to save media:", e);
  }
};

// Save ONLY lyrics/settings (Call this frequently for autosave)
export const saveLyrics = async (lyrics: LyricSegment[]) => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    
    store.put({
        lyrics: lyrics,
        timestamp: Date.now()
    }, KEY_DATA);
    
    return new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => {
            db.close();
            resolve();
        };
        tx.onerror = () => {
            db.close();
            reject(tx.error);
        };
    });
  } catch (e) {
    console.warn("Failed to save lyrics:", e);
  }
};

// Legacy wrapper for full save (not recommended for frequent use)
export const saveProjectData = async (
    audioFile: File | null, 
    imageFiles: Blob[], 
    lyrics: LyricSegment[]
) => {
    await saveMedia(audioFile, imageFiles);
    await saveLyrics(lyrics);
};

export const loadProjectData = async (): Promise<ProjectState | null> => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    
    const mediaReq = store.get(KEY_MEDIA);
    const dataReq = store.get(KEY_DATA);
    
    // Legacy support check
    const legacyReq = store.get('currentProject');

    return new Promise((resolve) => {
        tx.oncomplete = () => {
            db.close();
            
            const media = mediaReq.result;
            const data = dataReq.result;
            const legacy = legacyReq.result;

            // Prefer new split data
            if (media || data) {
                if (!media?.audioBlob && !data?.lyrics) {
                    resolve(null);
                    return;
                }
                resolve({
                    audioBlob: media?.audioBlob || null,
                    audioName: media?.audioName,
                    imageBlobs: media?.imageBlobs || [],
                    lyrics: data?.lyrics || [],
                    timestamp: data?.timestamp || Date.now()
                });
                return;
            }

            // Fallback to legacy
            if (legacy) {
                 resolve(legacy);
                 return;
            }

            resolve(null);
        };
        tx.onerror = () => {
            db.close();
            resolve(null);
        };
    });
  } catch (e) {
    console.warn("Failed to load project:", e);
    return null;
  }
};

export const clearProjectData = async () => {
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        
        // Clear all keys
        store.delete(KEY_MEDIA);
        store.delete(KEY_DATA);
        store.delete('currentProject'); // Legacy key
        
        return new Promise<void>((resolve, reject) => {
            tx.oncomplete = () => {
                db.close();
                resolve();
            };
            tx.onerror = () => {
                db.close();
                reject(tx.error);
            };
        });
    } catch(e) {
        console.warn("Failed to clear project data", e);
    }
};