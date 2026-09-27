export const displayValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
};

export function csvCell(value: unknown): string {
  let text = value == null ? '' : displayValue(value);
  // Text supplied by users must not be interpreted as a spreadsheet formula.
  if (typeof value !== 'number' && /^[\s]*[=+\-@\t\r\n]/.test(text))
    text = "'" + text;
  return `"${text.replace(/"/g, '""')}"`;
}

export function exportCsv(title: string, headers: string[], rows: unknown[][]) {
  const content =
    '\uFEFF' +
    [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
  const url = URL.createObjectURL(
    new Blob([content], { type: 'text/csv;charset=utf-8;' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function printRows(title: string, headers: string[], rows: unknown[][]) {
  const frame = document.createElement('iframe');
  frame.title = `Print ${title}`;
  frame.style.cssText = 'position:fixed;width:0;height:0;border:0;';
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  const win = frame.contentWindow;
  if (!doc || !win) {
    frame.remove();
    throw new Error('Unable to open print preview.');
  }
  const style = doc.createElement('style');
  style.textContent =
    '@page{size:landscape;margin:12mm}body{font:12px system-ui;color:#172033}h1{font-size:22px}table{width:100%;border-collapse:collapse}th,td{padding:8px;border:1px solid #dce1e8;text-align:left;overflow-wrap:anywhere}th{background:#f1f4f8}tr{break-inside:avoid}';
  doc.head.appendChild(style);
  doc.title = title;
  const heading = doc.createElement('h1');
  heading.textContent = title;
  doc.body.appendChild(heading);
  const count = doc.createElement('p');
  count.textContent = `${rows.length} filtered records`;
  doc.body.appendChild(count);
  const table = doc.createElement('table');
  const head = table.createTHead().insertRow();
  headers.forEach((value) => {
    const cell = doc.createElement('th');
    cell.textContent = value;
    head.appendChild(cell);
  });
  const body = table.createTBody();
  rows.forEach((values) => {
    const row = body.insertRow();
    values.forEach((value) => {
      row.insertCell().textContent = displayValue(value);
    });
  });
  doc.body.appendChild(table);
  win.onafterprint = () => frame.remove();
  win.focus();
  win.print();
  setTimeout(() => frame.remove(), 60_000);
}
