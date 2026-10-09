import type { Metadata } from 'next';
import { SettingsScreen } from '@/components/schedule/SettingsScreen';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Configuración del negocio | Kortek Booking',
  robots: { index: false, follow: false },
};

export default function SettingsPage() {
  return <SettingsScreen />;
}
