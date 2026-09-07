'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Leaf, Mail, Lock, LogIn } from 'lucide-react';
import { toast } from 'sonner';

export function LoginForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });
      if (result?.error) {
        toast.error('Credenciales incorrectas');
      } else {
        router.replace('/dashboard');
      }
    } catch (err: any) {
      toast.error(err?.message ?? 'Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md" style={{ boxShadow: 'var(--shadow-lg)' }}>
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-3 w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
          <Leaf className="w-7 h-7 text-primary" />
        </div>
        <CardTitle className="font-display text-2xl tracking-tight">
          Pedidos Fruta y Verdura
        </CardTitle>
        <CardDescription>
          Inicia sesión para gestionar los pedidos
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e: any) => setEmail(e?.target?.value ?? '')}
                required
                className="pl-10"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e: any) => setPassword(e?.target?.value ?? '')}
                required
                className="pl-10"
              />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                Entrando...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <LogIn className="w-4 h-4" />
                Iniciar Sesión
              </span>
            )}
          </Button>
        </form>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          ¿Necesitas acceso? Solicita una cuenta al administrador.
        </p>
      </CardContent>
    </Card>
  );
}
