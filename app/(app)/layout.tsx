import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AppSidebar } from './_components/app-sidebar';
import { MobileBottomNav } from '@/components/mobile-bottom-nav';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions).catch(() => null);
  return (
    <div className="flex min-h-screen">
      {/* Sidebar SOLO desktop (lg+) */}
      <AppSidebar user={session?.user ?? null} />

      <div className="flex-1 min-w-0">
        <main className="pb-[calc(env(safe-area-inset-bottom)+88px)] lg:pb-0">
          {children}
        </main>
      </div>

      {/* Bottom navigation SOLO mobile (<lg) */}
      <MobileBottomNav />
    </div>
  );
}
