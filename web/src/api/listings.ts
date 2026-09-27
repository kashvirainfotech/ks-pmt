import api from './client';

export function listingRows(response: any): Record<string, any>[] {
  const data = response?.data ?? response;
  if (Array.isArray(data)) return data;
  for (const key of [
    'data',
    'users',
    'tasks',
    'timeLogs',
    'auditLogs',
    'notifications',
  ]) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  throw new Error('The listing response did not contain a collection.');
}

// Load every authorized page before client-side grouping/sorting/export.
// Never present a partial collection as the complete result.
export async function fetchListing(
  path: string,
  params: Record<string, unknown> = {},
  signal?: AbortSignal,
) {
  const output: Record<string, any>[] = [];
  for (let page = 1; ; page++) {
    const response: any = await api.get(path, {
      params: { ...params, page, limit: 100 },
      signal,
    });
    const rows = listingRows(response);
    const data = response?.data;
    const meta = response?.meta ?? data?.meta ?? data;
    const pages = Number(meta?.total_pages ?? meta?.totalPages ?? 1);
    if (!Number.isFinite(pages) || pages < 0)
      throw new Error('Invalid pagination metadata.');
    if (page < pages && rows.length === 0)
      throw new Error('An incomplete listing was returned. Please retry.');
    output.push(...rows);
    if (page >= pages) return output;
  }
}
