import * as FileSystem from 'expo-file-system/legacy';
import { EncodingType } from 'expo-file-system/legacy';
import { fetchWithAuth } from '@/utils/authenticatedFetch';

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(
      null,
      bytes.subarray(i, Math.min(i + chunk, bytes.length)) as unknown as number[],
    );
  }
  return globalThis.btoa(binary);
}

/** Copy `content://` URIs to a stable `file://` path readable by expo-file-system. */
export async function ensurePdfReadableFileUri(rawUri: string): Promise<string> {
  if (rawUri.startsWith('file:')) return rawUri;
  if (!rawUri.startsWith('content:') || !FileSystem.cacheDirectory) return rawUri;
  const dest = `${FileSystem.cacheDirectory}pdf_preview_${Date.now()}.pdf`;
  await FileSystem.copyAsync({ from: rawUri, to: dest });
  return dest;
}

/** Load PDF bytes as base64 from remote (auth), file, or content URI. */
export async function loadPdfBase64(uri: string): Promise<string> {
  if (uri.startsWith('http://') || uri.startsWith('https://')) {
    const res = await fetchWithAuth(uri);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return arrayBufferToBase64(await res.arrayBuffer());
  }

  const fileUri = uri.startsWith('content:') ? await ensurePdfReadableFileUri(uri) : uri;
  if (!fileUri.startsWith('file:')) {
    throw new Error('Unsupported PDF URI');
  }
  return FileSystem.readAsStringAsync(fileUri, { encoding: EncodingType.Base64 });
}

/**
 * HTML document for react-native-webview on Android (no native PDF renderer).
 * Uses Mozilla pdf.js from CDN to paint every page on canvas elements.
 */
export function buildPdfJsViewerHtml(base64: string): string {
  const b64Literal = JSON.stringify(base64);
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { background: #525659; min-height: 100%; }
  #status {
    color: #f1f5f9;
    text-align: center;
    padding: 32px 16px;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 15px;
  }
  #pages { padding: 8px 0 24px; }
  canvas {
    display: block;
    margin: 10px auto;
    max-width: calc(100vw - 16px);
    height: auto;
    background: #fff;
    box-shadow: 0 2px 10px rgba(0,0,0,0.35);
  }
</style>
</head>
<body>
<div id="status">Chargement du PDF…</div>
<div id="pages"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
<script>
(function () {
  var statusEl = document.getElementById('status');
  var container = document.getElementById('pages');
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    var raw = atob(${b64Literal});
    var len = raw.length;
    var data = new Uint8Array(len);
    for (var i = 0; i < len; i++) data[i] = raw.charCodeAt(i);
    pdfjsLib.getDocument({ data: data }).promise.then(function (pdf) {
      statusEl.style.display = 'none';
      var chain = Promise.resolve();
      for (var p = 1; p <= pdf.numPages; p++) {
        (function (pageNum) {
          chain = chain.then(function () {
            return pdf.getPage(pageNum).then(function (page) {
              var baseViewport = page.getViewport({ scale: 1 });
              var scale = Math.min(2.5, (window.innerWidth - 16) / baseViewport.width);
              var viewport = page.getViewport({ scale: scale });
              var canvas = document.createElement('canvas');
              canvas.width = viewport.width;
              canvas.height = viewport.height;
              container.appendChild(canvas);
              return page.render({
                canvasContext: canvas.getContext('2d'),
                viewport: viewport
              }).promise;
            });
          });
        })(p);
      }
      return chain;
    }).catch(function () {
      statusEl.textContent = 'Impossible d\\u2019afficher ce PDF.';
      statusEl.style.display = 'block';
    });
  } catch (e) {
    statusEl.textContent = 'Impossible d\\u2019afficher ce PDF.';
  }
})();
</script>
</body>
</html>`;
}
