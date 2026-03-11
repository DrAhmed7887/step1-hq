import { useEffect, useState } from "react";

const STORAGE_UPDATE_EVENT = "war-room:storage-update";

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readStorageJson(key) {
  if (!isBrowser()) {
    return null;
  }

  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

export function writeStorageJson(key, value) {
  if (!isBrowser()) {
    return false;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(
      new CustomEvent(STORAGE_UPDATE_EVENT, {
        detail: { key, value }
      })
    );
    return true;
  } catch {
    return false;
  }
}

export function usePersistentState(key, createDefault, hydrateState) {
  const [state, setState] = useState(() => {
    const saved = readStorageJson(key);
    return hydrateState ? hydrateState(saved) : saved ?? createDefault();
  });

  useEffect(() => {
    writeStorageJson(key, state);
  }, [key, state]);

  return [state, setState];
}

export function useStorageJson(key, createDefault, hydrateState) {
  function resolveState(nextValue) {
    if (hydrateState) {
      return hydrateState(nextValue);
    }

    if (nextValue != null) {
      return nextValue;
    }

    return typeof createDefault === "function" ? createDefault() : createDefault;
  }

  const [state, setState] = useState(() => resolveState(readStorageJson(key)));

  useEffect(() => {
    setState(resolveState(readStorageJson(key)));
  }, [key]);

  useEffect(() => {
    if (!isBrowser()) {
      return undefined;
    }

    function handleStorage(event) {
      if (event instanceof StorageEvent && event.key && event.key !== key) {
        return;
      }

      setState(resolveState(readStorageJson(key)));
    }

    function handleCustom(event) {
      if (event.detail?.key !== key) {
        return;
      }

      setState(resolveState(event.detail.value));
    }

    window.addEventListener("storage", handleStorage);
    window.addEventListener(STORAGE_UPDATE_EVENT, handleCustom);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(STORAGE_UPDATE_EVENT, handleCustom);
    };
  }, [key]);

  return state;
}

export function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function readFileAsJson(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(JSON.parse(String(reader.result)));
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
