import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Registrieren - ZUTATO',
  description: 'Erstellen Sie ein kostenloses Konto bei ZUTATO und werden Sie Teil der Koch-Community.',
  keywords: 'Registrierung, Konto erstellen, ZUTATO, Rezepte, Koch-Community',
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 