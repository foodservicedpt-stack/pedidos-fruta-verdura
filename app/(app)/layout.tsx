import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AppSidebar } from './_components/app-sidebar';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions).catch(() => null);
  return (
    <div className="flex min-h-screen">
      <AppSidebar user={session?.user ?? null} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
