import { Badge, styled } from '@material-ui/core';
import { ArrowDownward, ArrowUpward } from '@material-ui/icons';
import React, { ReactNode } from 'react';
import { useColumnContext, useTableContext } from '../table';

const SortView = styled('div')({
  userSelect: 'none',
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) max-content',
  alignItems: 'center',
  cursor: 'pointer',

  '& > div': {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
});

const Empty = styled('div')({
  width: 20,
});

export function SortComponent<T, V>({ children }: { children: ReactNode }): JSX.Element {
  const state = useTableContext<T>();
  const column = useColumnContext<T, V>();
  const { direction, index } = state.useState((state) => {
    const index = state.sort.findIndex((s) => s.columnId === column.id) ?? -1;
    return {
      direction: state.sort[index]?.direction,
      index: index >= 0 ? index + 1 : undefined,
    };
  });

  function toggle(e: React.MouseEvent) {
    const {
      props: { sort: controlledSort, onSortChange },
    } = state.getState();

    const newDirection = direction === 'asc' ? 'desc' : 'asc';
    const newSort = (e.getModifierState('Control') ? state.getState().sort.filter((s) => s.columnId !== column.id) : []).concat({
      columnId: column.id,
      direction: newDirection,
    });

    if (!controlledSort) {
      state.update((state) => {
        state.sort = newSort;
      });
    }

    onSortChange?.(newSort);
  }

  return (
    <SortView onClick={toggle}>
      <div>{children}</div>

      <Badge badgeContent={index}>
        {direction === 'asc' ? <ArrowUpward fontSize="small" /> : direction === 'desc' ? <ArrowDownward fontSize="small" /> : <Empty />}
      </Badge>
    </SortView>
  );
}
