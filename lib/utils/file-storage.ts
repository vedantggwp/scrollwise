/**
 * File storage: OPFS primary, IndexedDB blob fallback.
 * Phase 1: store blob by key, retrieve by key. Keys are book IDs or derived.
 */

const DB_NAME = "ScrollwiseBlobs";
const STORE_NAME = "blobs";

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, { keyPath: "key" });
    };
  });
}

async function idbPut(key: string, blob: Blob): Promise<void> {
  const idb = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put({ key, blob });
    tx.oncomplete = () => {
      idb.close();
      resolve();
    };
    tx.onerror = () => {
      idb.close();
      reject(tx.error);
    };
  });
}

async function idbGet(key: string): Promise<Blob | undefined> {
  const idb = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(key);
    tx.oncomplete = () => {
      idb.close();
      resolve(req.result?.blob);
    };
    tx.onerror = () => {
      idb.close();
      reject(tx.error);
    };
  });
}

async function idbDelete(key: string): Promise<void> {
  const idb = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(key);
    tx.oncomplete = () => {
      idb.close();
      resolve();
    };
    tx.onerror = () => {
      idb.close();
      reject(tx.error);
    };
  });
}

// OPFS is only available in secure contexts and supported browsers
function isOPFSAvailable(): boolean {
  return typeof navigator !== "undefined" && "storage" in navigator && "getDirectory" in navigator.storage;
}

let opfsRoot: FileSystemDirectoryHandle | null = null;

async function getOPFSRoot(): Promise<FileSystemDirectoryHandle> {
  if (opfsRoot) return opfsRoot;
  if (!isOPFSAvailable()) throw new Error("OPFS not available");
  opfsRoot = await navigator.storage.getDirectory();
  return opfsRoot;
}

/**
 * Store a blob. Uses OPFS when available, else IndexedDB.
 */
export async function putBlob(key: string, blob: Blob): Promise<string> {
  try {
    const root = await getOPFSRoot();
    const file = await root.getFileHandle(key, { create: true });
    const w = await file.createWritable();
    await w.write(blob);
    await w.close();
    return key;
  } catch {
    await idbPut(key, blob);
    return key;
  }
}

/**
 * Retrieve a blob by key. Tries OPFS first, then IndexedDB.
 */
export async function getBlob(key: string): Promise<Blob | undefined> {
  try {
    const root = await getOPFSRoot();
    const file = await root.getFileHandle(key);
    const f = await file.getFile();
    return f;
  } catch {
    return idbGet(key);
  }
}

/**
 * Remove a blob by key from both OPFS and IDB (best effort).
 */
export async function deleteBlob(key: string): Promise<void> {
  try {
    const root = await getOPFSRoot();
    await root.removeEntry(key, { recursive: true });
  } catch {
    // ignore
  }
  await idbDelete(key);
}

/**
 * Check if OPFS is in use (for one-time user tip if not).
 */
export async function getStorageTier(): Promise<"opfs" | "idb"> {
  if (!isOPFSAvailable()) return "idb";
  try {
    await getOPFSRoot();
    return "opfs";
  } catch {
    return "idb";
  }
}
