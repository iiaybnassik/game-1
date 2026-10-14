# TPT Thumbnail Studio

## Chrome extension

The new ChatGPT automation extension is in [`extension/`](extension/README.md). It deeply analyzes a style reference, then requests three thumbnails in your existing ChatGPT conversation using your own resource pages and exact text. See that folder for installation, permissions, and compatibility limits. The original web application below remains unchanged.

A private, browser-based prompt builder for three Teachers Pay Teachers thumbnails. Built with Next.js, React, and TypeScript. No API, database, or authentication. The app does not generate images.

## Run on a Mac

Install Node.js 20.9 or newer from nodejs.org. Open Terminal in this repository, then run:

```sh
npm ci
npm run dev
```

Open http://localhost:3000 in your browser. To stop, press Control+C in Terminal.

## Use the studio

1. Upload a style reference and your actual resource page images (PNG, JPG, or WebP).
2. Edit Style DNA or paste an analysis made in another tool. Lock style to prevent edits.
3. Select each thumbnail and enter its exact text and resource pages.
4. Copy the prompt or generation package. Paste into your chosen image tool and manually attach the listed images.
5. Use Refinement for follow-up changes.

Projects and images automatically save in this browser using IndexedDB. Export a JSON backup to keep a portable copy, especially before clearing browser data. Import restores a backup. Images never leave the browser through this application. Clipboard access requires localhost or HTTPS. Generation packages contain text and an attachment checklist, not image files. Original `1.png` and `1.txt` assets remain untouched.

## Validation / production

```sh
npm test
npm run typecheck
npm run build
npm start
```

Browser workflow test (optional): run `npx playwright install chromium`, then `npm run test:browser`. On Linux with system Chromium, set `PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium`.
