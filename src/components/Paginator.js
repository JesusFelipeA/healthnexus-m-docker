import React, { useMemo, useState } from 'react';

import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

// ============================================================
// COLORES POR DEFECTO (fallback si no se pasan por prop)
// ============================================================

const DEFAULT_COLORS = {
  text: '#102A6A',
  sub: '#4F5D7A',
  faint: '#8B96B2',
  line: '#DDE4F0',
  tealDeep: '#4E2CCF',
  mint: '#EEE9FF',
};

// ============================================================
// CONFIG
// ============================================================

const PAGE_SIZES = [5, 10, 20, 50];

// ============================================================
// HELPERS
// ============================================================

function getPageItems(totalPages, currentPage) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const items = [1];
  const left = Math.max(2, currentPage - 1);
  const right = Math.min(totalPages - 1, currentPage + 1);

  if (left > 2) items.push('...');
  for (let i = left; i <= right; i++) items.push(i);
  if (right < totalPages - 1) items.push('...');
  items.push(totalPages);

  return items;
}

// ============================================================
// SUBCOMPONENTE
// ============================================================

function PageButton({ label, active, disabled, onPress, palette }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || active}
      style={({ pressed }) => [
        s.pageButton,
        { borderColor: palette.line, backgroundColor: '#fff' },
        active && {
          backgroundColor: palette.tealDeep,
          borderColor: palette.tealDeep,
        },
        disabled && s.pageButtonDisabled,
        pressed && !active && !disabled && s.pageButtonPressed,
      ]}
    >
      <Text
        style={[
          s.pageButtonText,
          { color: palette.text },
          active && { color: '#fff' },
          disabled && { color: palette.faint },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ============================================================
// PRINCIPAL
// ============================================================

export default function Paginator({
  page,
  totalPages,
  pageSize,
  totalItems,
  onChangePage,
  onChangePageSize,
  pageSizes = PAGE_SIZES,
  showPageSize = true,
  showCounter = true,
  style,
  colors: colorsProp,
}) {
  const palette = colorsProp || DEFAULT_COLORS;
  const [sizeOpen, setSizeOpen] = useState(false);

  const from = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);

  const items = useMemo(
    () => getPageItems(totalPages, page),
    [totalPages, page]
  );

  if (totalItems === 0) return null;

  return (
    <View style={[s.wrap, style]}>
      {(showCounter || showPageSize) && (
        <View style={s.top}>
          {showCounter ? (
            <Text style={[s.count, { color: palette.sub }]}>
              Mostrando{' '}
              <Text style={[s.countBold, { color: palette.text }]}>
                {from}–{to}
              </Text>{' '}
              de{' '}
              <Text style={[s.countBold, { color: palette.text }]}>
                {totalItems}
              </Text>
            </Text>
          ) : (
            <View />
          )}

          {showPageSize && (
            <Pressable
              style={[
                s.sizeButton,
                {
                  backgroundColor: '#fff',
                  borderColor: palette.line,
                },
              ]}
              onPress={() => setSizeOpen((v) => !v)}
            >
              <Text style={[s.sizeButtonText, { color: palette.sub }]}>
                {pageSize} / pág.
              </Text>
              <Text style={{ fontSize: 9, color: palette.sub }}>
                {sizeOpen ? '▲' : '▼'}
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {showPageSize && sizeOpen && (
        <View
          style={[
            s.sizeMenu,
            { backgroundColor: '#fff', borderColor: palette.line },
          ]}
        >
          {pageSizes.map((n) => {
            const active = n === pageSize;
            return (
              <Pressable
                key={n}
                style={[
                  s.sizeItem,
                  active && { backgroundColor: palette.mint },
                ]}
                onPress={() => {
                  onChangePageSize(n);
                  setSizeOpen(false);
                }}
              >
                <Text
                  style={[
                    s.sizeItemText,
                    { color: palette.sub },
                    active && {
                      color: palette.tealDeep,
                      fontWeight: '800',
                    },
                  ]}
                >
                  {n} por página
                </Text>

                {active && (
                  <Text
                    style={{
                      color: palette.tealDeep,
                      fontWeight: '800',
                      fontSize: 13,
                    }}
                  >
                    ✓
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>
      )}

      <View style={s.nav}>
        <PageButton
          label="‹"
          palette={palette}
          disabled={page === 1}
          onPress={() => onChangePage(page - 1)}
        />

        <View style={s.numbers}>
          {items.map((it, idx) =>
            it === '...' ? (
              <Text
                key={`e-${idx}`}
                style={[s.ellipsis, { color: palette.sub }]}
              >
                …
              </Text>
            ) : (
              <PageButton
                key={it}
                label={String(it)}
                palette={palette}
                active={it === page}
                onPress={() => onChangePage(it)}
              />
            )
          )}
        </View>

        <PageButton
          label="›"
          palette={palette}
          disabled={page === totalPages}
          onPress={() => onChangePage(page + 1)}
        />
      </View>
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================

const s = StyleSheet.create({
  wrap: {
    marginTop: 8,
    marginBottom: 24,
    paddingTop: 16,
    paddingBottom: 4,
  },

  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  count: {
    fontSize: 12,
  },

  countBold: {
    fontWeight: '800',
  },

  sizeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },

  sizeButtonText: {
    fontSize: 11,
    fontWeight: '700',
  },

  sizeMenu: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 4,
    marginBottom: 12,
    overflow: 'hidden',
  },

  sizeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  sizeItemText: {
    fontSize: 12,
    fontWeight: '600',
  },

  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },

  numbers: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    flexWrap: 'wrap',
    gap: 6,
  },

  pageButton: {
    minWidth: 36,
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  pageButtonDisabled: {
    opacity: 0.4,
  },

  pageButtonPressed: {
    opacity: 0.7,
  },

  pageButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },

  ellipsis: {
    fontSize: 14,
    paddingHorizontal: 4,
    fontWeight: '700',
  },
});