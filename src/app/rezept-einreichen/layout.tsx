import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Rezept einreichen - ZUTATO',
  description: 'Teile dein Lieblingsrezept mit der ZUTATO-Community. Erstelle und veröffentliche deine eigenen Rezepte.',
  keywords: 'Rezept einreichen, Rezept erstellen, Koch-Community, Rezept teilen',
  robots: 'noindex, nofollow', // Geschützte Seite nicht indexieren
};

export default function RezeptEinreichenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 