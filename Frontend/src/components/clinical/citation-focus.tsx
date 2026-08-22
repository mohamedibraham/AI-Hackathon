import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export interface FocusKey {
  turnId: string;
  marker: number;
}

type ElementMap = Map<string, HTMLElement>;

interface CitationFocusValue {
  active: FocusKey | null;
  setActive: (key: FocusKey | null) => void;
  registerMarker: (key: string, el: HTMLElement | null) => void;
  registerCard: (key: string, el: HTMLElement | null) => void;
  isActive: (turnId: string, marker: number) => boolean;
}

const keyOf = (turnId: string, marker: number) => `${turnId}::${marker}`;

const CitationFocusContext = createContext<CitationFocusValue | null>(null);

export function CitationFocusProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<FocusKey | null>(null);
  const markers = useRef<ElementMap>(new Map());
  const cards = useRef<ElementMap>(new Map());
  const [line, setLine] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);

  const registerMarker = useCallback((key: string, el: HTMLElement | null) => {
    if (el) markers.current.set(key, el);
    else markers.current.delete(key);
  }, []);

  const registerCard = useCallback((key: string, el: HTMLElement | null) => {
    if (el) cards.current.set(key, el);
    else cards.current.delete(key);
  }, []);

  const isActive = useCallback(
    (turnId: string, marker: number) => active?.turnId === turnId && active.marker === marker,
    [active],
  );

  useEffect(() => {
    if (!active) {
      setLine(null);
      return;
    }
    const compute = () => {
      const k = keyOf(active.turnId, active.marker);
      const m = markers.current.get(k);
      const c = cards.current.get(k);
      if (!m || !c) {
        setLine(null);
        return;
      }
      const mr = m.getBoundingClientRect();
      const cr = c.getBoundingClientRect();
      const markerFirst = mr.left < cr.left;
      setLine({
        x1: markerFirst ? mr.right : mr.left,
        y1: mr.top + mr.height / 2,
        x2: markerFirst ? cr.left : cr.right,
        y2: cr.top + Math.min(24, cr.height / 2),
      });
    };
    compute();
    window.addEventListener("scroll", compute, true);
    window.addEventListener("resize", compute);
    return () => {
      window.removeEventListener("scroll", compute, true);
      window.removeEventListener("resize", compute);
    };
  }, [active]);

  const value = useMemo(
    () => ({ active, setActive, registerMarker, registerCard, isActive }),
    [active, registerMarker, registerCard, isActive],
  );

  return (
    <CitationFocusContext.Provider value={value}>
      {children}
      {line ? (
        <svg className="pointer-events-none fixed inset-0 z-50 h-full w-full">
          <line
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke="var(--citation)"
            strokeWidth={1}
            strokeDasharray="3 4"
            opacity={0.8}
          />
          <circle cx={line.x2} cy={line.y2} r={2.5} fill="var(--citation)" />
        </svg>
      ) : null}
    </CitationFocusContext.Provider>
  );
}

export function useCitationFocus(): CitationFocusValue {
  const ctx = useContext(CitationFocusContext);
  if (!ctx) throw new Error("useCitationFocus must be used inside CitationFocusProvider");
  return ctx;
}

export { keyOf as citationKey };
