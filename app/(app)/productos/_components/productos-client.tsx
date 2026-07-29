'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search, Plus, Trash2, Edit3, Leaf, Apple, Salad, Package, X, Check, Save
} from 'lucide-react';
import { toast } from 'sonner';
import { FadeIn } from '@/components/ui/animate';
import { cn } from '@/lib/utils';
import { getTemporadaInfo, MESES_NOMBRES } from '@/lib/temporada';
import { CATEGORIAS } from '@/lib/constants';

interface Producto {
  id: number;
  nombre: string;
  categoria: string;
  unidad: string;
  enTemporada: boolean;
  activo: boolean;
  notas: string | null;
  ordenSeccion: number;
  mesInicioTemp: number | null;
  mesFinTemp: number | null;
}

const UNIDADES = ['Kg', 'Ud', 'Bolsa', 'Bandeja', 'Manojo'];
const catIcons: Record<string, any> = { Verduras: Leaf, Frutas: Apple, Ensaladas: Salad };

export function ProductosClient({ isAdmin = false }: { isAdmin?: boolean }) {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('Verduras');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ nombre: '', categoria: 'Verduras', unidad: 'Kg', notas: '', mesInicioTemp: '', mesFinTemp: '' });
  const [saving, setSaving] = useState(false);

  const fetchProductos = async () => {
    try {
      const res = await fetch('/api/productos');
      if (res.ok) setProductos(await res.json());
    } catch (err: any) {
      console.error(err?.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProductos(); }, []);

  const handleSubmit = async () => {
    if (!form.nombre.trim()) { toast.error('El nombre es obligatorio'); return; }
    setSaving(true);
    try {
      const payload = {
        nombre: form.nombre.trim(),
        categoria: form.categoria,
        unidad: form.unidad,
        notas: form.notas || null,
        mesInicioTemp: form.mesInicioTemp ? parseInt(form.mesInicioTemp) : null,
        mesFinTemp: form.mesFinTemp ? parseInt(form.mesFinTemp) : null,
      };

      const url = editingId ? `/api/productos/${editingId}` : '/api/productos';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error ?? 'Error');
      }

      toast.success(editingId ? 'Producto actualizado' : 'Producto añadido');
      resetForm();
      fetchProductos();
    } catch (err: any) {
      toast.error(err?.message ?? 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, nombre: string) => {
    if (!confirm(`¿Desactivar "${nombre}"? No aparecerá en los pedidos.`)) return;
    try {
      const res = await fetch(`/api/productos/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Producto desactivado');
        fetchProductos();
      }
    } catch (err: any) {
      toast.error('Error al eliminar');
    }
  };

  const handleEdit = (p: Producto) => {
    setEditingId(p.id);
    setForm({
      nombre: p.nombre,
      categoria: p.categoria,
      unidad: p.unidad,
      notas: p.notas ?? '',
      mesInicioTemp: p.mesInicioTemp?.toString() ?? '',
      mesFinTemp: p.mesFinTemp?.toString() ?? '',
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({ nombre: '', categoria: activeTab, unidad: 'Kg', notas: '', mesInicioTemp: '', mesFinTemp: '' });
  };

  const filtered = (productos ?? []).filter(p => {
    const matchSearch = !search || p.nombre.toLowerCase().includes(search.toLowerCase());
    const matchTab = p.categoria === activeTab;
    return matchSearch && matchTab;
  });

  return (
    <div className="p-4 lg:p-8 max-w-[1200px] mx-auto space-y-6">
      <FadeIn>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight flex items-center gap-2">
              <Package className="w-6 h-6 text-primary" /> Gestión de Productos
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Añade, edita o elimina productos del catálogo</p>
          </div>
          {isAdmin && (
            <Button onClick={() => { resetForm(); setShowForm(true); setForm(f => ({ ...f, categoria: activeTab })); }} className="gap-1.5">
              <Plus className="w-4 h-4" /> Añadir producto
            </Button>
          )}
        </div>
      </FadeIn>

      {showForm && (
        <FadeIn>
          <Card style={{ boxShadow: 'var(--shadow-md)' }} className="border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-display flex items-center justify-between">
                <span>{editingId ? 'Editar producto' : 'Nuevo producto'}</span>
                <Button variant="ghost" size="icon" onClick={resetForm}><X className="w-4 h-4" /></Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Nombre *</Label>
                  <Input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Tomate cherry" />
                </div>
                <div className="space-y-2">
                  <Label>Categoría *</Label>
                  <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} className="w-full rounded-lg border bg-background px-3 py-2 text-sm">
                    {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Unidad *</Label>
                  <select value={form.unidad} onChange={e => setForm(f => ({ ...f, unidad: e.target.value }))} className="w-full rounded-lg border bg-background px-3 py-2 text-sm">
                    {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Mes inicio temporada</Label>
                  <select value={form.mesInicioTemp} onChange={e => setForm(f => ({ ...f, mesInicioTemp: e.target.value }))} className="w-full rounded-lg border bg-background px-3 py-2 text-sm">
                    <option value="">Sin definir</option>
                    {MESES_NOMBRES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Mes fin temporada</Label>
                  <select value={form.mesFinTemp} onChange={e => setForm(f => ({ ...f, mesFinTemp: e.target.value }))} className="w-full rounded-lg border bg-background px-3 py-2 text-sm">
                    <option value="">Sin definir</option>
                    {MESES_NOMBRES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Notas</Label>
                  <Input value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} placeholder="Notas opcionales" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={resetForm}>Cancelar</Button>
                <Button onClick={handleSubmit} disabled={saving} className="gap-1.5">
                  <Save className="w-4 h-4" /> {saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Añadir'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar producto..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start">
          {CATEGORIAS.map(cat => {
            const Icon = catIcons[cat] ?? Leaf;
            const count = (productos ?? []).filter(p => p.categoria === cat).length;
            return (
              <TabsTrigger key={cat} value={cat} className="gap-1.5">
                <Icon className="w-3.5 h-3.5" /> {cat}
                <Badge variant="secondary" className="ml-1 text-xs h-5 px-1.5">{count}</Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {CATEGORIAS.map(cat => (
          <TabsContent key={cat} value={cat} className="mt-4">
            {loading ? (
              <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 bg-muted rounded animate-pulse" />)}</div>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No se encontraron productos</p>
            ) : (
              <div className="space-y-2">
                {filtered.map(p => {
                  const tempInfo = getTemporadaInfo(p.nombre, p.mesInicioTemp, p.mesFinTemp);
                  return (
                    <Card key={p.id} style={{ boxShadow: 'var(--shadow-sm)' }} className="hover:bg-accent/30 transition-colors">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium">{p.nombre}</span>
                              <Badge variant="outline" className="text-xs">{p.unidad}</Badge>
                              <Badge variant="outline" className={cn('text-xs', tempInfo.color, tempInfo.bgColor, tempInfo.borderColor)}>
                                {tempInfo.label}
                              </Badge>
                            </div>
                            {p.notas && <p className="text-xs text-muted-foreground mt-0.5">{p.notas}</p>}
                          </div>
                          {isAdmin && (
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(p)}>
                                <Edit3 className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(p.id, p.nombre)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
