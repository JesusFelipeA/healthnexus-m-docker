import { useEffect, useMemo, useState } from 'react';

const DEFAULT_PAGE_SIZE = 10;

/**
 * Hook reutilizable de paginación.
 */
export default function usePagination(
  list = [],
  {
    initialPage = 1,
    initialPageSize = DEFAULT_PAGE_SIZE,
    resetDeps = [],
  } = {}
) {
  const [page, setPageState] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  // Reset cuando cambian las dependencias externas (ej: filtro)
  useEffect(() => {
    setPageState(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, resetDeps);

  const totalItems = list.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);

  const paginated = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return list.slice(start, start + pageSize);
  }, [list, safePage, pageSize]);

  const setPage = (n) => {
    const clamped = Math.min(Math.max(1, n), totalPages);
    setPageState(clamped);
  };

  const setPageSize = (n) => {
    setPageSizeState(n);
    setPageState(1);
  };

  const next = () => setPage(safePage + 1);
  const prev = () => setPage(safePage - 1);
  const reset = () => {
    setPageState(1);
    setPageSizeState(initialPageSize);
  };

  return {
    page: safePage,
    pageSize,
    totalItems,
    totalPages,
    paginated,
    setPage,
    setPageSize,
    next,
    prev,
    reset,
  };
}