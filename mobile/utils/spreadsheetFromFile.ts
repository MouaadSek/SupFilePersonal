import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system/legacy';
import type { FileItem } from '@/types';

const MAX_ROWS = 400;
const MAX_COLS = 64;

export function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function loadSpreadsheetRows(file: FileItem): Promise<string[][]> {
  let wb: XLSX.WorkBook;
  if (file.localUri) {
    const b64 = await FileSystem.readAsStringAsync(file.localUri, { encoding: 'base64' });
    wb = XLSX.read(b64, { type: 'base64' });
  } else {
    const { fileAuthenticatedPreviewUrl } = await import('@/services/api/client');
    const remote =
      (file.id ? fileAuthenticatedPreviewUrl(file.id) : undefined) ||
      file.downloadUrl ||
      file.previewUrl;
    if (remote) {
      const { fetchWithAuth } = await import('@/utils/authenticatedFetch');
      const res = await fetchWithAuth(remote);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const ab = await res.arrayBuffer();
      wb = XLSX.read(new Uint8Array(ab), { type: 'array' });
    } else {
      throw new Error('No spreadsheet source');
    }
  }
  if (!wb.SheetNames.length) return [];
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<(string | number | boolean | null | undefined)[]>(ws, {
    header: 1,
    defval: '',
    raw: false,
  }) as unknown[];
  const rows: string[][] = [];
  for (let i = 0; i < Math.min(raw.length, MAX_ROWS); i++) {
    const row = raw[i];
    const arr = Array.isArray(row) ? row : [];
    const out: string[] = [];
    for (let j = 0; j < Math.min(arr.length, MAX_COLS); j++) {
      const c = arr[j];
      out.push(c == null || c === '' ? '' : String(c));
    }
    rows.push(out);
  }
  return rows;
}

export function spreadsheetRowsToHtml(
  rows: string[][],
  opts: { bg: string; text: string; border: string; headerBg: string },
): string {
  if (!rows.length) {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/></head><body style="margin:0;padding:16px;font-family:system-ui;background:${opts.bg};color:${opts.text}">Feuille vide.</body></html>`;
  }
  const thead = `<thead><tr>${rows[0].map((c) => `<th>${escapeHtml(c)}</th>`).join('')}</tr></thead>`;
  const bodyRows = rows.length <= 1 ? [] : rows.slice(1);
  const tbody = `<tbody>${bodyRows
    .map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`)
    .join('')}</tbody>`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><style>
body{margin:0;background:${opts.bg};color:${opts.text}}
table{border-collapse:collapse;font-size:14px;font-family:system-ui,-apple-system,sans-serif}
td,th{border:1px solid ${opts.border};padding:8px 10px;vertical-align:top;white-space:pre-wrap;word-break:break-word;max-width:min(320px,40vw)}
th{background:${opts.headerBg};font-weight:600;text-align:left}
tbody tr:nth-child(even){background:rgba(128,128,128,0.06)}
</style></head><body><div style="overflow:auto;padding:8px"><table>${thead}${tbody}</table></div></body></html>`;
}
