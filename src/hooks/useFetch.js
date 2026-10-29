import { mensajeApi } from '../utils/errors';
import { useCallback, useEffect, useRef, useState } from 'react';

// Carga datos de la API: { data, loading, error, reload }
export default function useFetch(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const fnRef = useRef(fn);
  useEffect(() => { fnRef.current = fn; });
  const alive = useRef(true);

  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  const load = useCallback(async (silent = false) => {
    if (!silent) setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fnRef.current();
      if (alive.current) setState({ data, loading: false, error: null });
    } catch (e) {
      if (alive.current) setState((s) => ({ data: s.data, loading: false, error: mensajeApi(e) }));
    }
  }, []);

  useEffect(() => { load(); }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  return { ...state, reload: load };
}
