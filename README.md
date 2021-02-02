# ts-data-grid

A simple, fast, sortable data grid written in TypeScript, designed for viewing and selecting rather than editing data, and for large numbers (many thousands) of rows.

## Usage

### Grid Behavior

The grid displays a scrollable array of rows of any type, with one or more sortable columns of values. Rows are identified by a unique key string. Functions associated with each grid column must be provided to allow the grid to determine the display value, and optionally the sort value, of each row.

The user may sort columns by clicking column headers. Each click cycles between ascending, descending, and default sort order (not just between ascending and descending; the user can reset the sort order to its default). Holding Ctrl or Shift allows the user to sort by multiple columns, modifying the existing sort order rather than replacing it with a new single-column sort order.

Unlike other grids, this grid is designed to display a large number (many thousands) of rows without visual glitches. It uses a relatively fixed set of elements in the DOM to display grid cells, and only updates them (rather than moving, creating and destroying them) when the grid scrolls. Thus the grid only supports "atomic" scrolling, like Excel, rather than smooth scrolling. This allows it to avoid the unfortunate and disorienting "blank" periods and other visual glitches which other JavaScript grids exhibit when the user is scrolling them.

In a sense, therefore, this is not a virtual grid, in that its entire dataset is expected to be ready when it is created. However it is a virtual grid in the sense that if only 10 rows are ever visible at once, then only 10 rows' DOM elements will ever be created to represent all visible rows, regardless of whether the grid has 10 rows or 1,000,000 rows, and regardless of how rapidly the user scrolls.

The grid is responsive, and will minimally add and remove DOM row elements as necessary when the grid's parent is resized.

### Creating Grids

Call `createGrid()`, supplying a `GridSettings` parameter. It will add the grid to the DOM, and return a function which takes no parameters and will destroy the grid, removing it from the DOM.

`GridSettings` is an object with the following properties:

* *root* - The parent HTML element into which the grid should be added.
* *className* - Any additional CSS classes to apply to the grid element.
* *initialScrollTop* - An optional scrollTop position to restore; or undefined. Useful if the scrollTop position has been previously saved via the *onScroll* callback.
* *rows* - An array of rows of `any` type.
* *rowKey* - Either the string name of the property of each row object which acts as its unique key, or a function which takes a row and returns its unique key. Keys are strings and must be unique for each row. They are used to identify the row; for instance, when clicked.
* *columns* - An array of `GridColumn` objects.
* *sortOrder* - An optional `TableSortOrder`; or undefined to use the default sort order. A sort order specified in this way will be indicated to the user as the current sort order by chevrons in the column headers.
* *defaultSortOrder* - An optional `TableSortOrder`, or undefined if data should not be sorted. This sort order applies when there is no current *sortOrder*, and so when no chevrons are displayed in the column headers.
* *onRowClick* - An optional function which will receive a `GridRowEvent` when a row is clicked; or undefined. That event has a *key* property which identifies the row, and a *preventDefault* function which can be called if the row should not be selected.
* *onSort* - An optional function which will receive a `GridSortEvent` when sorting is required; or undefined. This may be used to carry out sorting in a web worker, and/or persist the sort order. That event has a *sortOrder* property which is the (potentially new) `TableSortOrder`, and a *preventDefault* function which can be used to instruct the grid not to sort the rows, for instance if a web worker is doing it. It is expected that the grid will be recreated when such an optional asynchronous sort is complete, in order to update it. It is up to the caller to display any sort indicator UI.
* *onScroll* - A function which will receive a `GridScrollEvent` when the grid is scrolled. That event has a *scrollTop* property. This may be used to persist the grid's scrollTop position in order to restore it if the grid is recreated later, by passing it as `initialScrollTop` when creating the grid.
* *renderHeaderMenu* - A function to call to render a menu in the grid header alongside the column headers.
* *debug* - `true` to render some occasionally useful debug information; `false` otherwise.

### Grid Columns

`GridColumn` objects have the following properties:

* *key* - A unique key for this column, used to identify it in the sort order. Keys are strings.
* *property* - A function which, given a row, will return its data value for display purposes.
* *sortValue* - An optional function which, given a row, will return its data value for sorting purposes; or undefined. This may be useful when sorting values such as dates.
* *reverseSortOrder* - `true` to reverse the sort order by default (so ascending is in fact descending, and vice versa); `false` or `undefined` otherwise.
* *width* - The column width in pixels, as a number. The grid will append `px` where necessary.
* *label* - The label to use in the column header.

### Sort Order

A `TableSortOrder` is an array of `FieldSortOrder` objects. `FieldSortOrder` objects have two properties: the unique *key* of a grid column, and the *order* (a `SortOrder` value) in which to sort that column, which is either "ascending", "descending" or undefined.

Sorting proceeds from the first column in the sort order to the last.

An empty array indicates that no sorting is required. An undefined order for a column indicates that no sorting is required for that column.

### CSS Classes

These CSS classes are applied automatically, but may be customised via user CSS. This is a non-exhaustive list of the most important ones.

To get started quickly, you can apply the pre-existing *ts-data-grid-default* style to the grid when creating it, via the *className* property of `GridSettings`, and tailor from there.

* *ts-data-grid-container* - Applies to the grid as a whole. It is recommended to set any (optional) fixed width on this class, rather than on *ts-data-grid*.
* *ts-data-grid* - Applies to the grid row area. It is recommended to set any (optional) fixed height on this class, rather than on *ts-data-grid-container*.
* *ts-data-grid-header* - Applies to the grid header, which contains column headers.
* *ts-data-grid-column-header* - Applies to each column header.
* *ts-data-grid-row* - Applies to each grid row. It is recommended to set any font size, line height and overall height here rather than on *ts-data-grid-cell*.
* *ts-data-grid-cell* - Applies to each grid cell within a row.
* *ts-data-grid-alt* - Applies to alternating grid rows for styling purposes.
* *ts-data-grid-hot* - Applies to rows when hovered over.
* *ts-data-grid-selected* - Applies to rows when selected.
