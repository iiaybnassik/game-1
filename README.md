# Poster Club — Collaborative Poster Splitter

A browser-only poster printing tool. Uploaded PNG/JPG/PDF files never leave the browser.

## Develop

Use Node.js 20.19+ or 22.12+.

```sh
npm ci --cache /tmp/poster-npm
npm run dev
```

Run `npm test` for shared crop-coordinate tests and `npm run build` for the production bundle in `dist/`.

## Printing

Choose rows × columns, paper, orientation, Fit/Fill, overlap and cut marks. Export contains an original reference, teacher assembly guide, clean master, then labeled student pieces. Print at **100% / Actual size** with printer scaling disabled.

Each piece uses a 10 mm printer margin. Its image area is paper size minus 20 mm. Tile stride is image-area size minus overlap. All tile crops use one shared, centered image transform; overlapping regions therefore contain identical source coordinates. Preview and PDF use this same geometry. Student pages are rasterized at 150 DPI; crop geometry is exact, while visible detail depends on the uploaded image resolution and raster sampling. Fit preserves the entire image with white space; Fill crops the edges to cover the assembled rectangle. Custom grids support 1–20 rows and columns.

## PDF uploads

Upload a PDF up to 30 MB. The first page opens automatically; for a multi-page PDF, use the Poster page selector to choose the page to split. PDF.js renders the selected page locally with a bundled worker, respecting page rotation and page bounds. No external rendering service is used. PDF pages are rasterized at up to 216 DPI, capped at 4096 pixels per side. Password-protected PDFs require an unlocked copy.
