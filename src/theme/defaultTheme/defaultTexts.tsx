import { TableTheme } from '../../types';

export const defaultTexts: TableTheme['text'] = {
  selectColumns: 'Select visible columns',
  noResults: 'No results',
  exportTitle: 'Export',
  exportCopy: 'To clipboard',
  exportDownload: 'Download',
  today: 'Today',
  thisWeek: 'This week',
  reset: 'Reset',
  loading: 'Loading',
  selected: (count) => `${count} selected`,
};