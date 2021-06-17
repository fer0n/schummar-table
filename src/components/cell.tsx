import React, { memo } from 'react';
import { Id, useColumnContext, useTableContext } from '..';
import { c } from '../misc/helpers';
import { CellView } from './elements';
import { calcClassName } from './row';

export const Cell = memo(function Cell<T, V>({ itemId }: { itemId: Id }) {
  const state = useTableContext<T>();
  const column = useColumnContext<T, V>();
  const { className, content } = state.useState(
    (state) => {
      const item = state.activeItemsById.get(itemId);
      const index = item ? state.activeItems.indexOf(item) : -1;
      return {
        className: c(calcClassName(state.props.classes, index), calcClassName(column.classes, index)),
        content: item && column.renderCell(column.value(item), item),
      };
    },
    [itemId, column],
  );

  state.getState().props.debug?.('render cell', itemId, column.id);

  return <CellView className={className}>{content}</CellView>;
});
