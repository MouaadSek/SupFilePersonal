import { fetchWithAuth } from '@/utils/authenticatedFetch';

/** Charge un PDF distant en mémoire (sans `downloadAsync`) pour éviter le gestionnaire de téléchargements du système. */
export async function fetchPdfAsInlineDataUri(url: string): Promise<string> {
  const res = await fetchWithAuth(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const buf = await res.arrayBuffer();
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(
      null,
      bytes.subarray(i, Math.min(i + chunk, bytes.length)) as unknown as number[],
    );
  }
  return `data:application/pdf;base64,${globalThis.btoa(binary)}`;
}
