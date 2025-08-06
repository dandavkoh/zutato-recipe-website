import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Anmelden - ZUTATO',
  description: 'Melden Sie sich bei ZUTATO an, um Ihre Rezepte zu verwalten und die Community zu nutzen.',
  keywords: 'Login, Anmeldung, ZUTATO, Rezepte, Koch-Community',
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 