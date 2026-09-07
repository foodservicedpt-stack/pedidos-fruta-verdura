'use client';

/**
 * Navegación inferior para MOBILE (PWA premium).
 * - Solo las acciones frecuentes (Inicio, Pedidos, Nuevo pedido, Análisis, Más).
 * - El botón central "Nuevo pedido" es protagonista.
 * - Respeta safe-area-inset-bottom (env(safe-area-inset-bottom)).
 * - Touch targets >= 44px. Bottom sheet "Más" para lo secundario.
 * La sidebar queda solo para desktop (lg+).
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, ClipboardList, Plus, BarChart3, MoreHorizontal, X, Package, History, CalendarDays, Settings, Users, Leaf } from 'lucide-react';
import { cn } from '@/lib/utils';

const primaryItems = [
  { href: '/dashboard', label: 'Inicio', icon: Home },
  { href: '/pedidos', label: 'Pedidos', icon: ClipboardList },
];
const moreItems = [
  { href: '/productos', label: 'Productos', icon: Package },
  { href: '/historial', label: 'Historial', icon: History },
  { href: '/calendario', label: 'Calendario', icon: CalendarDays },
  { href: '/configuracion', label: 'Configuración', icon: Settings },
  { href: '/usuarios', label: 'Usuarios', icon: Users },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || (href !== '/' && pathname.startsWith(href + '/')) || pathname === href;
}

function NavItem({ href, label, icon: Icon, active, onClick }: { href: string; label: string; icon: any; active: boolean; onClick?: () => void }) {
  return (
    <Link href={href} onClick={onClick} className={cn('relative flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 rounded-lg', active ? 'text-primary' : 'text-muted-foreground', 'active:scale-95 transition-transform motion-reduce:transition-none')} aria-current={active ? 'page' : undefined}>
      <span className={cn('relative flex h-7 w-12 items-center justify-center', active && 'after:absolute after:-bottom-0.5 after:h-1 after:w-1 after:rounded-full after:bg-primary')}>
        <Icon className="h-[22px] w-[22px]" />
      </span>
      <span className="text-[10px] font-medium leading-none">{label}</span>
    </Link>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [more, setMore] = useState(false);

  useEffect(() => {
    document.body.style.overflow = more ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [more]);

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 lg:hidden border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80" style={{ boxShadow: '0 -4px 12px rgba(0,0,0,0.04)' }}>
        <div className="mx-auto flex items-stretch justify-between px-2 pb-[calc(env(safe-area-inset-bottom)+4px)] pt-1.5">
          {primaryItems.map(it => <NavItem key={it.href} href={it.href} label={it.label} icon={it.icon} active={isActive(pathname, it.href)} />)}

          {/* Nuevo pedido — botón central protagonista */}
          <div className="relative flex min-w-0 flex-1 items-center justify-center">
            <Link
              href="/pedidos/nuevo"
              aria-label="Nuevo pedido"
              className="flex -mt-5 h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg active:scale-95 transition-transform motion-reduce:transition-none"
              style={{ boxShadow: '0 8px 18px rgba(22,163,74,0.35)' }}
            >
              <Plus className="h-6 w-6" />
            </Link>
          </div>

          <NavItem href="/analisis" label="Análisis" icon={BarChart3} active={isActive(pathname, '/analisis')} />

          {/* Más — abre bottom sheet */}
          <button onClick={() => setMore(true)} className={cn('relative flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 rounded-lg text-muted-foreground active:scale-95 transition-transform motion-reduce:transition-none')} aria-label="Más opciones">
            <span className="relative flex h-7 w-12 items-center justify-center"><MoreHorizontal className="h-[22px] w-[22px]" /></span>
            <span className="text-[10px] font-medium leading-none">Más</span>
          </button>
        </div>
      </nav>

      {/* Bottom sheet "Más" */}
      {more && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMore(false)} aria-hidden />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-card border-t p-4 pb-[calc(env(safe-area-inset-bottom)+16px)]" style={{ boxShadow: '0 -8px 30px rgba(0,0,0,0.15)' }}>
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted" style={{ transform: 'translateY(-2px)' }} />
            <div className="flex items-center justify-between mb-2">
              <span className="font-display font-semibold text-base flex items-center gap-2"><Leaf className="w-4 h-4 text-primary" /> Más opciones</span>
              <button onClick={() => setMore(false)} aria-label="Cerrar" className="h-9 w-9 rounded-full bg-muted flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {moreItems.map(it => (
                <Link key={it.href} href={it.href} onClick={() => setMore(false)} className="flex items-center gap-3 rounded-xl border bg-card p-3 active:scale-[0.98] transition-transform motion-reduce:transition-none">
                  <span className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><it.icon className="w-5 h-5" /></span>
                  <span className="text-sm font-medium">{it.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
