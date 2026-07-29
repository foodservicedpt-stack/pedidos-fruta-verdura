'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  LayoutDashboard,
  ClipboardList,
  History,
  BarChart3,
  Settings,
  LogOut,
  Leaf,
  Menu,
  X,
  PlusCircle,
  CalendarDays,
  Package,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Inicio', icon: LayoutDashboard },
  { href: '/pedidos/nuevo', label: 'Nuevo Pedido', icon: PlusCircle },
  { href: '/pedidos', label: 'Pedidos', icon: ClipboardList },
  { href: '/productos', label: 'Productos', icon: Package },
  { href: '/historial', label: 'Historial', icon: History },
  { href: '/analisis', label: 'Análisis', icon: BarChart3 },
  { href: '/calendario', label: 'Calendario', icon: CalendarDays },
  { href: '/configuracion', label: 'Configuración', icon: Settings },
];

const adminItems = [
  { href: '/usuarios', label: 'Usuarios', icon: Users },
];

export function AppSidebar({ user }: { user: any }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <button
        className="fixed top-3 left-3 z-50 lg:hidden p-2 rounded-lg bg-card border"
        style={{ boxShadow: 'var(--shadow-sm)' }}
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed lg:static z-40 top-0 left-0 h-full w-64 bg-card border-r flex flex-col transition-transform duration-300',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
        style={{ boxShadow: 'var(--shadow-md)' }}
      >
        <div className="p-5 border-b">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Leaf className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display font-bold text-sm tracking-tight leading-tight">Pedidos</h1>
              <p className="text-xs text-muted-foreground">Fruta y Verdura</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-auto">
          {(navItems ?? [])?.map((item: any) => {
            const Icon = item?.icon;
            const isActive = pathname === item?.href || (item?.href !== '/dashboard' && pathname?.startsWith?.(item?.href ?? '___'));
            return (
              <Link
                key={item?.href}
                href={item?.href ?? '/dashboard'}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                {Icon && <Icon className="w-4 h-4 shrink-0" />}
                <span>{item?.label}</span>
              </Link>
            );
          })}
          {user?.role === 'admin' && (
            <>
              <div className="my-2 border-t" />
              {(adminItems ?? []).map((item: any) => {
                const Icon = item?.icon;
                const isActive = pathname === item?.href || pathname?.startsWith?.(item?.href ?? '___');
                return (
                  <Link
                    key={item?.href}
                    href={item?.href ?? '/dashboard'}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    {Icon && <Icon className="w-4 h-4 shrink-0" />}
                    <span>{item?.label}</span>
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        <div className="p-3 border-t">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
              {(user?.name ?? user?.email ?? 'U')?.[0]?.toUpperCase?.() ?? 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name ?? 'Usuario'}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email ?? ''}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground mt-1"
            onClick={() => signOut({ callbackUrl: '/login' })}
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </Button>
        </div>
      </aside>
    </>
  );
}
