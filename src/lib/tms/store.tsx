import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import type { AppState } from "@/types/domain";
import { createSeedState } from "./seed";
import { currentUser, type Result } from "./services";

const STORAGE_KEY = "pibythree-quality-hub-v1";

// Repository boundary: the only place that touches persistence.
// Swap this implementation for an HTTP/database repository without
// touching services or UI.
const repository = {
  read(): AppState | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as AppState) : null;
    } catch {
      return null;
    }
  },
  write(state: AppState) {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* quota exceeded — state stays in memory for this session */
    }
  },
  clear() {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(STORAGE_KEY);
  },
};

interface TmsContextValue {
  state: AppState;
  ready: boolean;
  update: (fn: (state: AppState) => AppState) => void;
  run: (fn: (state: AppState) => Result<AppState>, options?: { success?: string }) => boolean;
  resetDemoData: () => void;
}

const TmsContext = createContext<TmsContextValue | null>(null);

export function TmsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => createSeedState());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = repository.read();
    if (stored) setState(stored);
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) repository.write(state);
  }, [state, ready]);

  const update = useCallback((fn: (state: AppState) => AppState) => {
    setState((prev) => fn(prev));
  }, []);

  const run = useCallback(
    (fn: (state: AppState) => Result<AppState>, options?: { success?: string }) => {
      let succeeded = true;
      setState((prev) => {
        const result = fn(prev);
        if (result.ok) {
          if (options?.success) toast.success(options.success);
          return result.value;
        }
        succeeded = false;
        toast.error(result.error);
        return prev;
      });
      return succeeded;
    },
    [],
  );

  const resetDemoData = useCallback(() => {
    repository.clear();
    setState(createSeedState());
    toast.success("Demo data restored to its seeded state.");
  }, []);

  const value = useMemo(
    () => ({ state, ready, update, run, resetDemoData }),
    [state, ready, update, run, resetDemoData],
  );

  return <TmsContext.Provider value={value}>{children}</TmsContext.Provider>;
}

export function useTms() {
  const ctx = useContext(TmsContext);
  if (!ctx) throw new Error("useTms must be used inside TmsProvider");
  return ctx;
}

export function useSession() {
  const { state, ready } = useTms();
  return { user: currentUser(state), ready };
}
