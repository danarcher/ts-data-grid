import { GridColumn, TableSortOrder } from './grid';

export function getCellValue(row: any, column: any): any {
  const property = column.property;
  const value = (typeof property === 'function') ? property(row) : row[property];
  if (value === null || value === undefined) {
    return '';
  }
  return value;
}

export function getCellSortValue(row: any, column: any): any {
  const sortValue = column.sortValue;
  if (sortValue === undefined) {
    return getCellValue(row, column);
  }
  const value = (typeof sortValue === 'function') ? sortValue(row) : row[sortValue];
  return value;
}

export function compare(a: any, b: any): number {
  if (typeof a === 'string' && typeof b === 'string') {
    return a.localeCompare(b, 'en', { sensitivity: 'base' });
  }
  if (a < b) {
    return -1;
  }
  if (a > b) {
    return 1;
  }
  return 0;
}

export function sort(rows: any[], columns: GridColumn[], sortOrder: TableSortOrder, defaultSortOrder?: TableSortOrder): any[] {
  rows.sort((a, b) => {
    const order = (sortOrder && sortOrder.length > 0) ? sortOrder : (defaultSortOrder || []);
    for (const entry of order) {
      const column = columns.find((x) => x.key === entry.key);
      if (column === undefined) {
        continue;
      }
      const A = getCellSortValue(a, column);
      const B = getCellSortValue(b, column);
      let result = 0;
      switch (entry.order) {
        case 'ascending':
          result = compare(A, B);
          break;
        case 'descending':
          result = -compare(A, B);
          break;
        default:
          break;
      }
      if (column.reverseSortOrder) {
        result = -result;
      }
      if (result !== 0) {
        return result;
      }
    }
    return 0;
  });
  return rows;
}
