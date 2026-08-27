import { createContext, useContext, useState, ReactNode } from "react";
import type { Requester } from "../api.js";

interface RequesterContextValue {
  requester: Requester | null;
  setRequester: (r: Requester | null) => void;
}

const RequesterContext = createContext<RequesterContextValue | undefined>(undefined);

// BR-05: selection is session-only, in-memory — not persisted across a page
// refresh. This is intentional: the Requester Selector is a testing
// mechanism, not real auth, and Lab 3 replaces this entirely.
export function RequesterProvider({ children }: { children: ReactNode }) {
  const [requester, setRequester] = useState<Requester | null>(null);
  return (
    <RequesterContext.Provider value={{ requester, setRequester }}>
      {children}
    </RequesterContext.Provider>
  );
}

export function useRequester() {
  const ctx = useContext(RequesterContext);
  if (!ctx) {
    throw new Error("useRequester must be used inside a RequesterProvider");
  }
  return ctx;
}
