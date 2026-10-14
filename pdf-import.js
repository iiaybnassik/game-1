import {getDocument, GlobalWorkerOptions} from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
GlobalWorkerOptions.workerSrc = workerUrl;

export async function openPdf(file) {
  return getDocument({data:new Uint8Array(await file.arrayBuffer()),useSystemFonts:true,isEvalSupported:false}).promise;
}

export async function renderPdfPage(document, pageNumber) {
  const page = await document.getPage(pageNumber);
  try {
    const original = page.getViewport({scale:1});
    // 216 DPI for ordinary pages, capped to avoid oversized browser canvases.
    const scale = Math.min(3,4096/Math.max(original.width,original.height));
    const viewport = page.getViewport({scale});
    const canvas = window.document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    await page.render({canvasContext:canvas.getContext('2d'),viewport,background:'rgb(255,255,255)'}).promise;
    const image = new Image();
    image.src = canvas.toDataURL('image/png');
    await image.decode();
    return image;
  } finally {
    page.cleanup();
  }
}
