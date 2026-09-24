import type { Metadata } from 'next';
import { MediaEditor } from '@/components/media/MediaEditor';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Medios y promociones | Kortek Booking', robots: { index: false, follow: false } };

export default function MediaPage() { return <MediaEditor />; }
