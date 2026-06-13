import { useState, useCallback } from 'react';
import { jsx, jsxs } from 'react/jsx-runtime';
import { c as TableHead } from './table_CCSrKi0d.mjs';

function useSortState(defaultKey, defaultDirection) {
  const [sort, setSort] = useState(
    null
  );
  const toggleSort = useCallback((key) => {
    setSort((prev) => {
      if (prev?.key === key) {
        return prev.direction === "asc" ? { key, direction: "desc" } : null;
      }
      return { key, direction: "asc" };
    });
  }, []);
  const sortData = useCallback(
    (data, getCellValue, defaultSort) => {
      if (!sort) return defaultSort ? defaultSort(data) : data;
      return [...data].sort((a, b) => {
        const valA = getCellValue(a, sort.key);
        const valB = getCellValue(b, sort.key);
        let cmp;
        if (typeof valA === "number" && typeof valB === "number") {
          cmp = valA - valB;
        } else {
          cmp = String(valA ?? "").localeCompare(String(valB ?? ""));
        }
        return sort.direction === "asc" ? cmp : -cmp;
      });
    },
    [sort]
  );
  const isSorted = useCallback(
    (key) => {
      if (sort?.key === key) return sort.direction;
      return null;
    },
    [sort]
  );
  return { sort, toggleSort, sortData, isSorted };
}

function SortableHeader({
  children,
  sortKey,
  currentDirection,
  onSort,
  className
}) {
  return /* @__PURE__ */ jsx(
    TableHead,
    {
      className: `cursor-pointer select-none hover:bg-muted/50 transition-colors ${className ?? ""}`,
      onClick: () => onSort(sortKey),
      children: /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center gap-1", children: [
        children,
        /* @__PURE__ */ jsxs("span", { className: "inline-flex flex-col leading-none text-[10px] ml-0.5", children: [
          /* @__PURE__ */ jsx(
            "span",
            {
              className: currentDirection === "asc" ? "text-foreground" : "text-muted-foreground/40",
              children: "▲"
            }
          ),
          /* @__PURE__ */ jsx(
            "span",
            {
              className: currentDirection === "desc" ? "text-foreground" : "text-muted-foreground/40",
              children: "▼"
            }
          )
        ] })
      ] })
    }
  );
}

export { SortableHeader as S, useSortState as u };
