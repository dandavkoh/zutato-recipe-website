import { requireAuth } from '@/utils/serverAuthUtils';
import Link from 'next/link';
import AccountForm from './AccountForm';

export const metadata = {
  title: 'Account verwalten - ZUTATO',
  description: 'Profilinformationen bearbeiten und Passwort ändern',
};

export default async function AccountPage() {
  const user = await requireAuth('/account');

  return (
    <div className="min-h-screen bg-gray-50">
      <section className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Account verwalten</h1>
              <p className="text-gray-600">Bearbeite deine Profilinformationen und ändere dein Passwort</p>
            </div>
            <div className="text-sm">
              <Link href={`/user/${user.id}`} className="text-orange-700 hover:underline">Öffentliches Profil ansehen</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <AccountForm initialUser={{
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            email: user.email,
          }} />
        </div>
      </section>
    </div>
  );
}

