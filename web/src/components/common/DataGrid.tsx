import React, { useEffect, useMemo, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getGroupedRowModel,
  getExpandedRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type GroupingState,
  type ExpandedState,
  type Row,
} from '@tanstack/react-table';
import {
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Layers3,
  Plus,
  Printer,
  Download,
  X,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Inbox,
  LoaderCircle,
  type LucideIcon,
} from 'lucide-react';
import { displayValue, exportCsv, printRows } from './gridExport';

export type GridColumn<T> = {
  id: string;
  label: string;
  value?: (row: T) => unknown;
  render?: (row: T) => React.ReactNode;
  type?: 'number' | 'text';
};
export type GridAction<T> = {
  label: string;
  icon: LucideIcon;
  onClick: (row: T) => void | Promise<void>;
  hidden?: (row: T) => boolean;
  disabled?: (row: T) => boolean;
  danger?: boolean;
};
export function ActionButton({
  icon: Icon,
  children,
  onClick,
  disabled,
  danger = false,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      className={`grid-action ${danger ? 'grid-action-danger' : ''}`}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon size={15} aria-hidden="true" />
      {children}
    </button>
  );
}
export function DataGrid<T extends { id?: string }>({
  title,
  data,
  columns,
  actions = [],
  extraActions,
  onAdd,
  addLabel = 'Add',
  loading = false,
  error,
  onRetry,
  toolbar,
  initialSorting = [],
  preservePageOnDataChange = false,
}: {
  title: string;
  data: T[];
  columns: GridColumn<T>[];
  actions?: GridAction<T>[];
  extraActions?: (row: T) => React.ReactNode;
  onAdd?: () => void;
  addLabel?: string;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  toolbar?: React.ReactNode;
  initialSorting?: SortingState;
  preservePageOnDataChange?: boolean;
}) {
  const [search, setSearch] = useState('');
  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const [filters, setFilters] = useState<ColumnFiltersState>([]);
  const [grouping, setGrouping] = useState<GroupingState>([]);
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [panel, setPanel] = useState<'filters' | 'sort' | 'group' | null>(null);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const definitions = useMemo<ColumnDef<T>[]>(
    () =>
      columns.map((column) => ({
        id: column.id,
        header: column.label,
        accessorFn: (row: T) => {
          const value = column.value
            ? column.value(row)
            : (row as Record<string, unknown>)[column.id];
          return column.type === 'number' && value != null
            ? Number(value)
            : (value ?? '');
        },
        cell: (context) =>
          column.render
            ? column.render(context.row.original)
            : displayValue(context.getValue()),
        filterFn: (row, id, value) =>
          displayValue(row.getValue(id))
            .toLocaleLowerCase()
            .includes(String(value).toLocaleLowerCase()),
        sortingFn: column.type === 'number' ? 'basic' : 'alphanumeric',
        aggregationFn: undefined,
      })),
    [columns],
  );
  const table = useReactTable({
    data,
    columns: definitions,
    state: {
      globalFilter: search,
      sorting,
      columnFilters: filters,
      grouping,
      expanded,
      pagination,
    },
    onGlobalFilterChange: setSearch,
    onSortingChange: setSorting,
    onColumnFiltersChange: setFilters,
    onGroupingChange: setGrouping,
    onExpandedChange: setExpanded,
    onPaginationChange: setPagination,
    globalFilterFn: (row, id, value) =>
      displayValue(row.getValue(id))
        .toLocaleLowerCase()
        .includes(String(value).toLocaleLowerCase()),
    getColumnCanGlobalFilter: () => true,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    autoResetPageIndex: !preservePageOnDataChange,
    groupedColumnMode: false,
    paginateExpandedRows: false,
    getRowId: (row, index) => row.id ?? String(index),
  });
  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, [search, filters, grouping, sorting]);
  const pages = Math.max(1, table.getPageCount());
  useEffect(() => {
    if (pagination.pageIndex >= pages)
      setPagination((p) => ({ ...p, pageIndex: pages - 1 }));
  }, [pages, pagination.pageIndex]);
  const count = table.getFilteredRowModel().rows.length;
  const hasActions = actions.length > 0 || !!extraActions;
  const span = columns.length + Number(hasActions);
  const getOutput = () => {
    const leaves = (rows: Row<T>[]): Row<T>[] =>
      rows.flatMap((row) => (row.getIsGrouped() ? leaves(row.subRows) : [row]));
    return leaves(table.getSortedRowModel().rows).map((row) =>
      columns.map((column) => row.getValue(column.id)),
    );
  };
  const output = (print: boolean) => {
    try {
      (print ? printRows : exportCsv)(
        title,
        columns.map((c) => c.label),
        getOutput(),
      );
    } catch (e: any) {
      setActionError(e.message || 'Unable to prepare records.');
    }
  };
  const run = async (action: GridAction<T>, row: T, id: string) => {
    setBusy(id);
    setActionError('');
    try {
      await action.onClick(row);
    } catch (e: any) {
      setActionError(
        e.response?.data?.message || e.message || 'Action failed.',
      );
    } finally {
      setBusy(null);
    }
  };
  const label = (id: string) => columns.find((c) => c.id === id)?.label ?? id;
  return (
    <section
      className="listing-grid"
      aria-label={`${title} listing`}
      aria-busy={loading}
    >
      <div className="grid-heading">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold">{title}</h2>
          <span className="grid-count">{loading ? '…' : count}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <ActionButton
            icon={Printer}
            disabled={loading || !!error || !count}
            onClick={() => output(true)}
          >
            Print
          </ActionButton>
          <ActionButton
            icon={Download}
            disabled={loading || !!error || !count}
            onClick={() => output(false)}
          >
            Export CSV
          </ActionButton>
          {onAdd && (
            <button type="button" className="grid-add" onClick={onAdd}>
              <Plus size={17} aria-hidden="true" />
              {addLabel}
            </button>
          )}
        </div>
      </div>
      <div className="grid-toolbar">
        <div className="grid-search">
          <Search size={17} aria-hidden="true" />
          <input
            aria-label={`Search ${title}`}
            placeholder={`Search ${title.toLowerCase()}…`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button aria-label="Clear search" onClick={() => setSearch('')}>
              <X size={15} />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {(['filters', 'sort', 'group'] as const).map((name, i) => {
            const Icon = [SlidersHorizontal, ArrowUpDown, Layers3][i];
            const total = [filters.length, sorting.length, grouping.length][i];
            return (
              <button
                key={name}
                className={`grid-action ${panel === name ? 'grid-action-selected' : ''}`}
                aria-expanded={panel === name}
                onClick={() => setPanel(panel === name ? null : name)}
              >
                <Icon size={15} aria-hidden="true" />
                {['Filters', 'Sort', 'Group'][i]}
                {total > 0 && <span className="grid-count">{total}</span>}
              </button>
            );
          })}
        </div>
        {toolbar}
      </div>
      {panel && (
        <div className="grid-config">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {panel === 'filters'
                ? 'Match values across columns'
                : panel === 'sort'
                  ? 'Sort priority · first rule takes precedence'
                  : 'Group hierarchy · first column is the outer group'}
            </p>
            <button
              className="grid-action"
              onClick={() => {
                if (panel === 'filters') {
                  setFilters([]);
                  setSearch('');
                } else if (panel === 'sort') setSorting([]);
                else {
                  setGrouping([]);
                  setExpanded({});
                }
              }}
            >
              Clear {panel}
            </button>
          </div>
          {panel === 'filters' ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {columns.map((c) => (
                <label key={c.id} className="text-xs font-medium">
                  {c.label}
                  <input
                    className="form-control mt-1 w-full"
                    aria-label={`Filter ${c.label}`}
                    placeholder="Contains…"
                    value={String(
                      table.getColumn(c.id)?.getFilterValue() ?? '',
                    )}
                    onChange={(e) =>
                      table.getColumn(c.id)?.setFilterValue(e.target.value)
                    }
                  />
                </label>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {(panel === 'sort' ? sorting.map((s) => s.id) : grouping).map(
                (id, index) => (
                  <div className="grid-rule" key={id}>
                    <span className="grid-count">{index + 1}</span>
                    {label(id)}
                    {panel === 'sort' && (
                      <button
                        aria-label={`Toggle ${label(id)} sort direction`}
                        onClick={() =>
                          setSorting((s) =>
                            s.map((rule) =>
                              rule.id === id
                                ? { ...rule, desc: !rule.desc }
                                : rule,
                            ),
                          )
                        }
                      >
                        {sorting[index].desc ? (
                          <ArrowDown size={14} />
                        ) : (
                          <ArrowUp size={14} />
                        )}
                      </button>
                    )}
                    <button
                      aria-label={`Remove ${label(id)} ${panel}`}
                      onClick={() =>
                        panel === 'sort'
                          ? setSorting((s) =>
                              s.filter((rule) => rule.id !== id),
                            )
                          : setGrouping((g) => g.filter((key) => key !== id))
                      }
                    >
                      <X size={14} />
                    </button>
                  </div>
                ),
              )}
              <select
                className="form-control max-w-full"
                aria-label={
                  panel === 'sort' ? 'Add sort column' : 'Add group column'
                }
                value=""
                onChange={(e) => {
                  if (!e.target.value) return;
                  if (panel === 'sort')
                    setSorting((s) => [
                      ...s,
                      { id: e.target.value, desc: false },
                    ]);
                  else setGrouping((g) => [...g, e.target.value]);
                }}
              >
                <option value="">+ Add column</option>
                {columns
                  .filter((c) =>
                    panel === 'sort'
                      ? !sorting.some((s) => s.id === c.id)
                      : !grouping.includes(c.id),
                  )
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
              </select>
              {panel === 'group' && grouping.length > 0 && (
                <>
                  <button
                    className="grid-action"
                    onClick={() => table.toggleAllRowsExpanded(true)}
                  >
                    Expand all
                  </button>
                  <button
                    className="grid-action"
                    onClick={() => table.toggleAllRowsExpanded(false)}
                  >
                    Collapse all
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
      {(error || actionError) && (
        <div
          role="alert"
          className="px-5 py-3 text-sm text-red-600 dark:text-red-400"
        >
          {error || actionError}
          {error && onRetry && (
            <button className="ml-3 underline" onClick={onRetry}>
              Retry
            </button>
          )}
        </div>
      )}
      <div
        className="grid-table-scroll"
        tabIndex={0}
        aria-label={`${title} table scroll area`}
      >
        <table className="listing-table">
          <caption className="sr-only">
            {title}. Shift-click column headers to sort by multiple columns.
            Print and export include all filtered records.
          </caption>
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => (
                  <th
                    key={header.id}
                    scope="col"
                    aria-sort={
                      header.column.getIsSorted() === 'asc'
                        ? 'ascending'
                        : header.column.getIsSorted() === 'desc'
                          ? 'descending'
                          : 'none'
                    }
                  >
                    <button
                      title="Click to sort; Shift-click to add another column"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                      {header.column.getIsSorted() ? (
                        header.column.getIsSorted() === 'desc' ? (
                          <ArrowDown size={14} />
                        ) : (
                          <ArrowUp size={14} />
                        )
                      ) : (
                        <ArrowUpDown size={13} className="opacity-35" />
                      )}
                      {sorting.length > 1 && header.column.getIsSorted() && (
                        <span className="grid-count">
                          {header.column.getSortIndex() + 1}
                        </span>
                      )}
                    </button>
                  </th>
                ))}
                {hasActions && <th scope="col">Actions</th>}
              </tr>
            ))}
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={span}>
                  <div className="grid-empty" role="status">
                    <LoaderCircle className="animate-spin" size={24} />
                    Loading records…
                  </div>
                </td>
              </tr>
            ) : error ? null : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={span}>
                  <div className="grid-empty">
                    <Inbox size={28} />
                    <strong>No records found</strong>
                    <span>Try a different search or clear your filters.</span>
                  </div>
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) =>
                row.getIsGrouped() ? (
                  <tr key={row.id} className="grid-group-row">
                    <td colSpan={span}>
                      <button
                        style={{ paddingLeft: row.depth * 20 }}
                        aria-expanded={row.getIsExpanded()}
                        onClick={row.getToggleExpandedHandler()}
                      >
                        {row.getIsExpanded() ? (
                          <ChevronDown size={17} />
                        ) : (
                          <ChevronRight size={17} />
                        )}
                        <span className="text-slate-500 dark:text-slate-400">
                          {label(row.groupingColumnId!)}:
                        </span>{' '}
                        {displayValue(
                          row.getGroupingValue(row.groupingColumnId!),
                        )}
                        <span className="grid-count">
                          {
                            row
                              .getLeafRows()
                              .filter((leaf) => !leaf.getIsGrouped()).length
                          }{' '}
                          records
                        </span>
                      </button>
                    </td>
                  </tr>
                ) : (
                  <tr key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    ))}
                    {hasActions && (
                      <td>
                        <div className="grid-row-actions">
                          {actions
                            .filter((action) => !action.hidden?.(row.original))
                            .map((action) => (
                              <ActionButton
                                key={action.label}
                                icon={action.icon}
                                danger={action.danger}
                                disabled={
                                  busy !== null ||
                                  action.disabled?.(row.original)
                                }
                                onClick={() =>
                                  void run(action, row.original, row.id)
                                }
                              >
                                {action.label}
                              </ActionButton>
                            ))}
                          {extraActions?.(row.original)}
                        </div>
                      </td>
                    )}
                  </tr>
                ),
              )
            )}
          </tbody>
        </table>
      </div>
      <div className="grid-footer">
        <span aria-live="polite">
          {loading
            ? 'Loading…'
            : `${count} records${grouping.length ? ` · ${table.getGroupedRowModel().rows.length} groups` : ''}`}
        </span>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2">
            {grouping.length ? 'Groups' : 'Rows'} per page
            <select
              className="form-control"
              aria-label="Rows per page"
              value={pagination.pageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <span>
            Page {pagination.pageIndex + 1} of {pages}
          </span>
          <div className="flex gap-1">
            {[
              {
                label: 'First page',
                Icon: ChevronsLeft,
                disabled: !table.getCanPreviousPage(),
                fn: () => table.setPageIndex(0),
              },
              {
                label: 'Previous page',
                Icon: ChevronLeft,
                disabled: !table.getCanPreviousPage(),
                fn: () => table.previousPage(),
              },
              {
                label: 'Next page',
                Icon: ChevronRight,
                disabled: !table.getCanNextPage(),
                fn: () => table.nextPage(),
              },
              {
                label: 'Last page',
                Icon: ChevronsRight,
                disabled: !table.getCanNextPage(),
                fn: () => table.setPageIndex(pages - 1),
              },
            ].map(({ label, Icon, disabled, fn }) => (
              <button
                key={label}
                className="grid-page-button"
                aria-label={label}
                disabled={loading || !!error || disabled}
                onClick={fn}
              >
                <Icon size={17} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
