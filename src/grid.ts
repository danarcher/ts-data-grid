import _ from 'lodash';
import ResizeObserver from 'resize-observer-polyfill';
import { getCellValue, sort } from './sort';

function div(parent: HTMLElement, className: string): HTMLElement {
  const element = document.createElement('div');
  element.className = className;
  parent.appendChild(element);
  return element;
}

type Row = any;
type RowKey = string;

export interface GridColumn {
  key: string,
  property: (_row: Row) => any,
  sortValue?: (_row: Row) => any;
  reverseSortOrder?: boolean,
  width: number,
  label: string,
}

export type SortOrder = 'ascending' | 'descending' | undefined;

export interface FieldSortOrder {
  key: string;
  order: SortOrder;
}

export type TableSortOrder = FieldSortOrder[];

export type RowKeyFunction = (row: Row) => RowKey;

export interface GridEvent {
  preventDefault: () => void;
}

export interface GridRowEvent extends GridEvent {
  row: Row;
}

export interface GridSortEvent extends GridEvent {
  sortOrder: TableSortOrder;
}

export interface GridScrollEvent extends GridEvent {
  scrollTop: number;
}

export interface GridSettings {
  root: HTMLElement;
  className: string;
  initialScrollTop?: number;

  rows: Row[];
  rowKey: RowKey | RowKeyFunction;
  columns: GridColumn[];
  sortOrder?: TableSortOrder;
  defaultSortOrder?: TableSortOrder;

  onRowClick?: (event: GridRowEvent) => void;
  onSort?: (event: GridSortEvent) => void;
  onScroll?: (event: GridScrollEvent) => void;
  renderHeaderMenu: (element: HTMLElement) => void;

  debug?: boolean;
}

type DestroyGridFunction = () => void;

export function createGrid(settings: GridSettings) : DestroyGridFunction {
  const {
    root,
    columns,
    className,
    rowKey,
    debug,
    defaultSortOrder,
    renderHeaderMenu,
    onRowClick,
    onSort,
    onScroll,
    initialScrollTop,
  } = settings;
  let rows = settings.rows;
  let sortOrder = settings.sortOrder || [];

  const container = div(root, `ts-data-grid-container ${className}`);
  const debugElement = div(container, '');
  const header = div(container, 'ts-data-grid-header');
  const headerMain = div(header, 'ts-data-grid-header-main');
  const columnHeaderContainer = div(headerMain, 'ts-data-grid-column-header-container');
  if (renderHeaderMenu) {
    const menuContainer = div(header, 'ts-data-grid-header-menu');
    renderHeaderMenu(menuContainer);
  }
  const grid = div(container, 'ts-data-grid');
  const rowContainer = div(grid, 'ts-data-grid-row-container');
  const scrollContainer = div(grid, 'ts-data-grid-scroll-container');
  const scrollArea = div(scrollContainer, 'ts-data-grid-scroll-area');

  const rowHeight = ((): number => {
    const element = document.createElement('div');
    element.className = `ts-data-grid-row ${className}`;
    element.innerText = 'Test'; // Some content to measure.
    document.body.appendChild(element);
    const height = element.getBoundingClientRect().height;
    document.body.removeChild(element);
    return height;
  })();

  let gridHeight = 0;
  let visibleRowCount = 0;
  let firstVisibleRowIndex = 0;
  let lastVisibleRowIndex = 0;
  let totalColumnWidth = 0;
  let totalRowHeight = 0;

  let hotRowKey: RowKey | undefined;
  let selectedRowKey: RowKey | undefined;

  let renderCount = 0;
  let mouseX: number | undefined;
  let mouseY: number | undefined;
  let resizeObserver: ResizeObserver | undefined;

  function getRowKey(row: Row): string {
    return String((typeof rowKey === 'function') ? rowKey(row) : row[rowKey]);
  }

  function renderCell(parent: HTMLElement, row: Row, column: GridColumn): void {
    const element = div(parent, 'ts-data-grid-cell');
    element.style.width = `${column.width}px`;
    element.dataset.key = column.key;
    element.textContent = getCellValue(row, column);
  }

  function renderRow(row: Row, i: number): void {
    const key = getRowKey(row);

    // Alternating, hot and selected rows are differently coloured/styled.
    const alt = ((i % 2) !== 0) ? 'ts-data-grid-alt' : '';
    const sel = (key === selectedRowKey) ? 'ts-data-grid-selected' : '';

    const element = div(rowContainer, `ts-data-grid-row ${alt} ${sel}`);
    element.dataset.key = key;
    element.dataset.index = i.toString();
    element.style.width = `${totalColumnWidth}px`;

    columns.map((column) => renderCell(element, row, column));
  }

  function renderDebug(): void {
    if (debug) {
      const scrollTop = scrollContainer.scrollTop;
      debugElement.innerHTML =
      `Render ${renderCount} Row height ${rowHeight}, grid height ${gridHeight}, max ${visibleRowCount} visible rows of ${rows.length} from ${firstVisibleRowIndex} to ${lastVisibleRowIndex}
      <br/>hot ${String(hotRowKey)} selected ${String(selectedRowKey)}
      <br/>Scroll top ${scrollTop} reaches ${scrollTop + gridHeight} out of: ${scrollArea.style.height} plus (any horizontal scrollbar)`;
    }
  }

  function recomputeVisibleArea(): boolean {
    const scrollLeft = scrollContainer.scrollLeft;
    rowContainer.scrollLeft = scrollLeft;
    columnHeaderContainer.scrollLeft = scrollLeft;

    const scrollTop = scrollContainer.scrollTop;

    const newGridHeight = grid.clientHeight;

    // Work out what portion of the available rows we can see.
    //
    // Overestimate our visible row count, ceil(). Overestimating has no visible
    // effect (we render null rows), but underestimating will hide rows.
    const newVisibleRowCount = Math.ceil(newGridHeight / rowHeight);
    // Overestimate how far we are down, ceil(). Overestimating will hide the
    // first row as soon as scrollTop > 0. Underestimating may hide the last row
    // which is bad news.
    const newFirstVisibleRowIndex = Math.ceil(scrollTop / rowHeight);
    const newLastVisibleRowIndex = newFirstVisibleRowIndex + newVisibleRowCount - 1;

    // Our scroll area is precisely (total column width x total row height).
    const newTotalColumnWidth = columns.reduce((sum, x) => sum + x.width, 0);
    const newTotalRowHeight = rows.length * rowHeight;

    if (newGridHeight !== gridHeight ||
        newVisibleRowCount !== visibleRowCount ||
        newFirstVisibleRowIndex !== firstVisibleRowIndex ||
        newLastVisibleRowIndex !== lastVisibleRowIndex ||
        newTotalColumnWidth !== totalColumnWidth ||
        newTotalRowHeight !== totalRowHeight) {
      if (newTotalColumnWidth !== totalColumnWidth) {
        scrollArea.style.width = `${newTotalColumnWidth}px`;
      }

      if (newTotalRowHeight !== totalRowHeight) {
        scrollArea.style.height = `${newTotalRowHeight}px`;
      }

      if (newFirstVisibleRowIndex !== firstVisibleRowIndex && onScroll) {
        onScroll({ scrollTop: scrollTop, preventDefault: () => { /* Nothing to do. */ } });
      }

      gridHeight = newGridHeight;
      visibleRowCount = newVisibleRowCount;
      firstVisibleRowIndex = newFirstVisibleRowIndex;
      lastVisibleRowIndex = newLastVisibleRowIndex;
      totalColumnWidth = newTotalColumnWidth;
      totalRowHeight = newTotalRowHeight;

      renderDebug();
      return true;
    }

    renderDebug();
    return false;
  }

  function createRows(): void {
    while (rowContainer.firstChild) {
      rowContainer.removeChild(rowContainer.firstChild);
    }

    for (let i = 0; i < visibleRowCount; ++i) {
      const row = rows[firstVisibleRowIndex + i];
      if (row) {
        renderRow(row, i);
      }
    }

    ++renderCount;
    renderDebug();
  }

  function updateRows(forceUpdate = false): void {
    if (recomputeVisibleArea() || forceUpdate) {
      createRows();
    }
  }

  function getRowElementAtMouse(): [RowKey?, HTMLElement?] {
    // Remove the "hot" row indicator whilst scrolling with the scroll bar.
    const gridRect = grid.getBoundingClientRect();
    const gridScrollBarWidth = 17; // HACK: Wild guess ignoring zoom factors.
    if (mouseX && mouseX > gridRect.right - gridScrollBarWidth) {
      mouseX = undefined;
      mouseY = undefined;
    }
    const none: [RowKey?, HTMLElement?] = [undefined, undefined];

    if (!mouseX || !mouseY) {
      return none;
    }

    const elements = document.elementsFromPoint(
      mouseX,
      mouseY,
    ).filter((x) => x.classList.contains('ts-data-grid-row'));

    if (elements.length === 0) {
      return none;
    }

    const element = elements[0];
    if (!(element instanceof HTMLElement)) {
      return none;
    }

    const key = element.dataset.key;
    if (!key) {
      return none;
    }

    return [key, element];
  }

  function findRowElement(key: RowKey): Element | undefined {
    if (!key) {
      return undefined;
    }
    return rowContainer.querySelector(`[data-key="${key}"]`) || undefined;
  }

  function onClick(e: MouseEvent): void {
    mouseX = e.clientX;
    mouseY = e.clientY;

    const [key] = getRowElementAtMouse();
    if (key !== selectedRowKey) {
      if (selectedRowKey) {
        const element = findRowElement(selectedRowKey);
        if (element) {
          element.classList.remove('ts-data-grid-selected');
        }
      }

      let handled = false;
      if (onRowClick) {
        const row = rows.find((x) => getRowKey(x) === key);
        if (row) {
          onRowClick({
            row: row,
            preventDefault: () => { handled = true; },
          });
        }
      }

      if (!handled) {
        selectedRowKey = key;
        if (selectedRowKey) {
          const element = findRowElement(selectedRowKey);
          if (element) {
            element.classList.add('ts-data-grid-selected');
          }
        }
      }
    }
  }

  function updateHotRow(): void {
    const [key] = getRowElementAtMouse();
    if (hotRowKey) {
      const element = findRowElement(hotRowKey);
      if (element) {
        element.classList.remove('ts-data-grid-hot');
      }
    }
    hotRowKey = key;
    if (hotRowKey) {
      const element = findRowElement(hotRowKey);
      if (element) {
        element.classList.add('ts-data-grid-hot');
      }
    }
  }

  function handleMouseMove(e: MouseEvent): void {
    mouseX = e.clientX;
    mouseY = e.clientY;
    updateHotRow();
  }

  function handleMouseLeave(): void {
    mouseX = undefined;
    mouseY = undefined;
    updateHotRow();
  }

  function handleScroll(): void {
    updateRows();
    updateHotRow();
  }

  function handleResize(): void {
    updateRows();
  }

  function cycleColumnSortOrder(order: SortOrder): SortOrder {
    if (order === undefined) {
      return 'ascending';
    }
    if (order === 'ascending') {
      return 'descending';
    }
    if (defaultSortOrder) {
      return undefined;
    }
    return 'ascending';
  }

  function sortRows(): void {
    rows = sort([...rows], columns, sortOrder, defaultSortOrder);
  }

  function onColumnHeaderClick(e: MouseEvent): void {
    const element = e.currentTarget as HTMLElement;
    const columnKey = element.dataset.key;

    if (!columnKey) {
      throw new Error('Grid column header element has no key.');
    }

    // Copy our current sort order.
    let newSortOrder: TableSortOrder = JSON.parse(JSON.stringify(sortOrder));

    // Find, or create, an entry for this column.
    let entry = newSortOrder.find((x) => x.key === columnKey);
    if (entry === undefined) {
      entry = { key: columnKey, order: undefined };
    }

    if (!e.ctrlKey && !e.shiftKey) {
      // We're replacing the sort order.
      newSortOrder = [];
    } else {
      // We're modifying the sort order, remove this old column.
      newSortOrder = newSortOrder.filter((x) => x.key !== columnKey);
    }

    // Cycle the column sort order.
    entry.order = cycleColumnSortOrder(entry.order);
    if (entry.order !== undefined) {
      newSortOrder.push(entry);
    }

    sortOrder = newSortOrder;
    updateColumnHeaders();

    let handled = false;
    if (onSort) {
      onSort({
        sortOrder,
        preventDefault: () => { handled = true; },
      });
    }

    if (!handled) {
      sortRows();
      updateRows(true);
    }
  }

  function renderColumnHeader(column: GridColumn): void {
    if (typeof column.key !== 'string') {
      throw new Error('Column header keys must be strings.'); // Since === with data.key.
    }

    const element = div(columnHeaderContainer, 'ts-data-grid-column-header');
    element.style.width = `${column.width}px`;
    element.dataset.key = column.key;
    element.textContent = column.label;
    element.addEventListener('click', onColumnHeaderClick);

    const span = document.createElement('span');
    element.appendChild(span);
    const entry = sortOrder.find((x) => x.key === column.key);

    switch (entry && entry.order) {
      case 'ascending':
        span.innerHTML = '&#x25B4;';
        break;
      case 'descending':
        span.innerHTML = '&#x25Be;';
        break;
      default:
        break;
    }
  }

  function updateColumnHeaders(): void {
    while (columnHeaderContainer.firstChild) {
      columnHeaderContainer.removeChild(columnHeaderContainer.firstChild);
    }
    columns.map(renderColumnHeader);
  }

  function destroyGrid(): void {
    resizeObserver?.disconnect();
    resizeObserver = undefined;
    container.parentElement?.removeChild(container);
  }

  const handleScrollThrottled = _.throttle(handleScroll, 16);

  updateColumnHeaders();
  recomputeVisibleArea();
  if (!onSort) {
    sortRows();
  }
  updateRows(true);

  grid.addEventListener('click', onClick);
  grid.addEventListener('mousemove', handleMouseMove);
  grid.addEventListener('mouseleave', handleMouseLeave);
  scrollContainer.addEventListener('scroll', handleScrollThrottled);
  resizeObserver = new ResizeObserver(handleResize);
  resizeObserver.observe(container);

  if (initialScrollTop) {
    scrollContainer.scrollTop = initialScrollTop;
  }

  return destroyGrid;
}
