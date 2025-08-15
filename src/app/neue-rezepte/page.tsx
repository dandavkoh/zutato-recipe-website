import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Neue Rezepte - KochMeister',
  description: 'Diese Seite wurde nach /alle-rezepte verschoben.',
};

export default async function NeueRezeptePage() {
  redirect('/alle-rezepte');
} 