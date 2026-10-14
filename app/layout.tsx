import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'TPT Thumbnail Studio', description: 'Build precise, consistent prompts for your resource thumbnails. No AI service required.' };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en"><body>{children}</body></html>; }
