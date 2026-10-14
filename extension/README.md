# TPT Thumbnail Studio — Chrome extension

This is a separate browser extension. The existing Next.js application and original assets are unchanged. No API, server, authentication system, or backend database is added. You use your own existing ChatGPT login and image-generation allowance.

## What it does

- Upload a reference and multiple actual resource images.
- Set exact headline, subtitle, badge, and included-items wording for three thumbnails.
- Select resource pages separately for each thumbnail.
- Analyze the reference deeply in ChatGPT: layout, palette, typography, framing, proportions, background, and decoration.
- Capture that analysis locally and lock it as the style direction.
- Send three generation requests sequentially, waiting for a completed image before sending the next.
- Refine the last completed thumbnail in the same conversation.
- Stop future automated steps, copy a generation prompt, and export/import a local project backup.

The reference controls STYLE ONLY; your images supply the PRODUCT; your text supplies EXACT WORDING. Matching 100% and exact text rendering cannot be guaranteed by an image model. Review generated images before using them.

## Install in Chrome (no Terminal required)

1. Download the GitHub repository ZIP and extract it.
2. In Chrome open `chrome://extensions`.
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked**.
5. Select the **extension** folder inside the extracted repository, not the whole repository.
6. Open `https://chatgpt.com`, sign in, and start a fresh conversation with a model that supports images.
7. Click Chrome's puzzle-piece Extensions button, then **TPT Thumbnail Studio — ChatGPT Assistant**. The side panel opens.

Use current desktop Chrome (116 or newer). Safari, Firefox, mobile browsers, and an ordinary Vercel website cannot run this Chrome side-panel extension. It is not published in the Chrome Web Store.

## Run

Upload a reference and your pages. Enter text and choose product pages on all three numbered tabs. Check the permission box, then click **Analyze + create all 3 thumbnails**. Keep the same ChatGPT conversation open. The extension sends the reference for analysis, captures the answer, then sends each thumbnail prompt with the selected product images. Finished images remain in ChatGPT, where you review and download them.

For more control, click **Analyze reference only**, inspect the returned Style DNA, unlock and edit it if needed, then click **Create all 3 using current Style DNA**. To retry after an error, inspect the conversation and remove any partial draft or attachments first. Starting the full workflow again sends a new full set, not an automatic resume. It can consume additional ChatGPT allowance.

Stop automation prevents future prompts; it does not undo already-sent messages or necessarily stop ChatGPT's current generation. Refinement is tied to the last completed thumbnail and original conversation.

## Privacy and permissions

The extension runs only on `https://chatgpt.com`. It reads the chat composer and assistant responses and uploads images only after you check the consent box and start an action. It does not read cookies, extract tokens, use a hidden API, or send content to another service. Images, project text, analysis, and run status are stored locally in your Chrome profile (`chrome.storage.local`). `unlimitedStorage` accommodates local image files. Export backups before clearing extension data or removing the extension. The permission checkbox must be checked again when reopening the panel.

## Compatibility / known limits

ChatGPT has no stable public browser-automation contract. The adapter uses the current editor, file input, attachment preview, assistant-message, and send-button DOM patterns. Interface changes, account tiers, regional differences, model choices, upload limits, generation limits, or confirmation requests can interrupt it. It fails visibly rather than skipping failed steps or silently resending. It does not bypass restrictions, solve CAPTCHAs, or log you in. ChatGPT responses can take several minutes; each generation step times out after four minutes.

**Validation:** automated tests exercise the panel and content adapter in real Chromium against a controlled ChatGPT-like page, with simulated Chrome extension messaging and storage. The environment’s managed browser blocks loading unpacked extensions, so the packaged MV3 extension could not be installed here. This proves upload, sending, response capture, ordering, persistence, cancellation, and safe failure for the tested interface. It does not establish compatibility with your live signed-in ChatGPT account. That must be tested by you after installation.

## Maintainer tests

```sh
npm test
PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium npx playwright test --config tests/extension/playwright.config.ts
```

On a Mac omit `PLAYWRIGHT_CHROMIUM_PATH` after installing Playwright's Chromium with `npx playwright install chromium`. This is optional for maintainers, not needed to install the unpacked extension.
