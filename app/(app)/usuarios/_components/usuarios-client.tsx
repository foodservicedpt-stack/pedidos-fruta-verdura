'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Users, Plus, Trash2, Edit3, Save, X, Shield, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';
import { FadeIn } from '@/components/ui/animate';
import { useRouter } from 'next/navigation';

interface Usuario {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: string;
}

export function UsuariosClient() {
  const { data: session } = useSession() || {};
  const router = useRouter();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user' });
  const [saving, setSaving] = useState(false);

  const isAdmin = (session?.user as any)?.role === 'admin';

  const fetchUsuarios = async () => {
    try {
      const res = await fetch('/api/usuarios');
      if (res.status === 403) {
        toast.error('No tienes permisos de administrador');
        router.replace('/dashboard');
        return;
      }
      if (res.ok) setUsuarios(await res.json());
    } catch (err: any) {
      console.error(err?.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) fetchUsuarios();
  }, [session]);

  const handleSubmit = async () => {
    if (editingId) {
      // Update
      setSaving(true);
      try {
        const payload: any = { name: form.name, role: form.role };
        if (form.password) payload.password = form.password;
        const res = await fetch(`/api/usuarios/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e?.error); }
        toast.success('Usuario actualizado');
        resetForm();
        fetchUsuarios();
      } catch (err: any) {
        toast.error(err?.message ?? 'Error');
      } finally {
        setSaving(false);
      }
    } else {
      // Create
      if (!form.email || !form.password) { toast.error('Email y contraseña son obligatorios'); return; }
      setSaving(true);
      try {
        const res = await fetch('/api/usuarios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e?.error); }
        toast.success('Usuario creado');
        resetForm();
        fetchUsuarios();
      } catch (err: any) {
        toast.error(err?.message ?? 'Error');
      } finally {
        setSaving(false);
      }
    }
  };

  const handleDelete = async (id: string, name: string | null) => {
    if (!confirm(`¿Eliminar al usuario "${name ?? 'Sin nombre'}"?`)) return;
    try {
      const res = await fetch(`/api/usuarios/${id}`, { method: 'DELETE' });
      if (!res.ok) { const e = await res.json(); throw new Error(e?.error); }
      toast.success('Usuario eliminado');
      fetchUsuarios();
    } catch (err: any) {
      toast.error(err?.message ?? 'Error');
    }
  };

  const handleEdit = (u: Usuario) => {
    setEditingId(u.id);
    setForm({ name: u.name ?? '', email: u.email, password: '', role: u.role });
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({ name: '', email: '', password: '', role: 'user' });
  };

  if (!isAdmin) {
    return (
      <div className="p-4 lg:p-8 max-w-[1200px] mx-auto text-center py-20">
        <Shield className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-muted-foreground">Solo los administradores pueden acceder a esta sección</p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-[1200px] mx-auto space-y-6">
      <FadeIn>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight flex items-center gap-2">
              <Users className="w-6 h-6 text-primary" /> Gestión de Usuarios
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Crea, edita roles y gestiona usuarios del sistema</p>
          </div>
          <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-1.5">
            <Plus className="w-4 h-4" /> Nuevo usuario
          </Button>
        </div>
      </FadeIn>

      {showForm && (
        <FadeIn>
          <Card style={{ boxShadow: 'var(--shadow-md)' }} className="border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-display flex items-center justify-between">
                <span>{editingId ? 'Editar usuario' : 'Nuevo usuario'}</span>
                <Button variant="ghost" size="icon" onClick={resetForm}><X className="w-4 h-4" /></Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nombre del usuario" />
                </div>
                <div className="space-y-2">
                  <Label>Email {!editingId && '*'}</Label>
                  <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@ejemplo.com" disabled={!!editingId} />
                </div>
                <div className="space-y-2">
                  <Label>Contraseña {!editingId && '*'}</Label>
                  <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder={editingId ? 'Dejar vacío para no cambiar' : 'Contraseña'} />
                </div>
                <div className="space-y-2">
                  <Label>Rol</Label>
                  <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className="w-full rounded-lg border bg-background px-3 py-2 text-sm">
                    <option value="user">Usuario</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={resetForm}>Cancelar</Button>
                <Button onClick={handleSubmit} disabled={saving} className="gap-1.5">
                  <Save className="w-4 h-4" /> {saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      )}

      <div className="space-y-2">
        {loading ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 bg-muted rounded animate-pulse" />)}</div>
        ) : (usuarios ?? []).length === 0 ? (
          <Card className="text-center py-12" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <CardContent>
              <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No hay usuarios registrados</p>
            </CardContent>
          </Card>
        ) : (
          (usuarios ?? []).map((u: Usuario) => (
            <Card key={u.id} style={{ boxShadow: 'var(--shadow-sm)' }} className="hover:bg-accent/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      {u.role === 'admin' ? <Shield className="w-5 h-5 text-primary" /> : <UserIcon className="w-5 h-5 text-muted-foreground" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{u.name ?? 'Sin nombre'}</span>
                        <Badge variant={u.role === 'admin' ? 'default' : 'outline'} className="text-xs">
                          {u.role === 'admin' ? 'Admin' : 'Usuario'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(u)}>
                      <Edit3 className="w-3.5 h-3.5" />
                    </Button>
                    {(session?.user as any)?.id !== u.id && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(u.id, u.name)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
