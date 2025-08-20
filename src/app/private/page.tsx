import { requireAuth } from '@/utils/serverAuthUtils';

export default async function PrivatePage() {
  const user = await requireAuth('/private');

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Private Page</h1>
      <p className="text-lg">Hello {user.email}</p>
      <p className="text-gray-600">
        Welcome {user.firstName} {user.lastName}!
      </p>
    </div>
  );
} 