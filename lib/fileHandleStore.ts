/**
 * FileSystem Access API directory handles'larını IndexedDB'de saklar.
 * Sayfa yenilemelerinde bile handle geçerli kalır (Chrome/Edge).
 */

const DB_NAME = "patent-tracker";
const STORE = "dir-handles";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveDirHandle(
  key: string,
  handle: FileSystemDirectoryHandle
): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(handle, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function getDirHandle(
  key: string
): Promise<FileSystemDirectoryHandle | null> {
  const db = await openDB();
  const handle = await new Promise<FileSystemDirectoryHandle | null>(
    (resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    }
  );
  db.close();
  return handle;
}

export async function openFileFromDir(
  handle: FileSystemDirectoryHandle,
  fileName: string
): Promise<void> {
  // İzin kontrolü / talebi
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const h = handle as any;
  let perm = await h.queryPermission({ mode: "read" });
  if (perm !== "granted") {
    perm = await h.requestPermission({ mode: "read" });
    if (perm !== "granted") throw new Error("İzin reddedildi");
  }

  const fileHandle = await handle.getFileHandle(fileName);
  const file = await fileHandle.getFile();
  const url = URL.createObjectURL(file);

  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (["pdf", "png", "jpg", "jpeg", "tif", "tiff"].includes(ext)) {
    // PDF ve resimler: yeni sekmede aç
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  } else {
    // Word vb.: indir (tarayıcı kısıtlaması nedeniyle)
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
