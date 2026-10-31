import { useEffect, useRef } from 'react';

type Handlers = Record<string, (data: never) => void>;

// Server-sent events from the studio server. EventSource reconnects on its own after a drop.
export function useEvents(handlers: Handlers) {
  const ref = useRef(handlers);
  ref.current = handlers;
  useEffect(() => {
    const source = new EventSource('/api/events');
    const names = Object.keys(ref.current);
    const listeners = names.map((name) => {
      const listener = (e: MessageEvent) => {
        try {
          ref.current[name]?.(JSON.parse(e.data) as never);
        } catch (error) {
          console.error(`studio: bad ${name} event`, error);
        }
      };
      source.addEventListener(name, listener);
      return [name, listener] as const;
    });
    return () => {
      listeners.forEach(([name, l]) => source.removeEventListener(name, l));
      source.close();
    };
  }, []);
}
