'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Settings, Bell, Save, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { FadeIn } from '@/components/ui/animate';

export function ConfiguracionClient({ isAdmin = false }: { isAdmin?: boolean }) {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [activo, setActivo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/configuracion/teams');
        if (res.ok) {
          const data = await res.json();
          setWebhookUrl(data?.webhookUrl ?? '');
          setActivo(data?.activo ?? false);
        }
      } catch (err: any) {
        console.error(err?.message);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/configuracion/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl, activo }),
      });
      if (res.ok) {
        toast.success('Configuración guardada');
      } else {
        toast.error('Error al guardar');
      }
    } catch (err: any) {
      toast.error(err?.message ?? 'Error');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!webhookUrl) {
      toast.error('Introduce la URL del webhook primero');
      return;
    }
    setTesting(true);
    try {
      const message = {
        '@type': 'MessageCard',
        themeColor: '4CAF50',
        summary: 'Test de notificación',
        sections: [{
          activityTitle: '🥦 Test - Pedidos Fruta y Verdura',
          text: 'Esta es una notificación de prueba. Si la ves, la integración funciona correctamente.',
        }],
      };
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });
      if (res.ok) {
        toast.success('Notificación de prueba enviada');
      } else {
        toast.error('Error al enviar la prueba. Verifica la URL del webhook.');
      }
    } catch (err: any) {
      toast.error('Error de conexión. Verifica la URL del webhook.');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-[1200px] mx-auto space-y-6">
      <FadeIn>
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-primary" /> Configuración
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Ajustes del sistema de pedidos</p>
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <Card style={{ boxShadow: 'var(--shadow-sm)' }}>
          <CardHeader>
            <CardTitle className="text-base font-display flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" /> Notificaciones Microsoft Teams
            </CardTitle>
            <CardDescription>
              Configura el webhook de Teams para recibir notificaciones cuando se envíen pedidos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="h-20 bg-muted rounded-lg animate-pulse" />
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="webhook">URL del Webhook de Teams</Label>
                  <Input
                    id="webhook"
                    placeholder="https://outlook.office.com/webhook/..."
                    value={webhookUrl}
                    onChange={(e: any) => setWebhookUrl(e?.target?.value ?? '')}
                  />
                  <p className="text-xs text-muted-foreground">
                    Para obtener la URL, crea un conector "Incoming Webhook" en tu canal de Teams.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={activo} onCheckedChange={setActivo} />
                  <Label>Notificaciones {activo ? 'activadas' : 'desactivadas'}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Button onClick={handleSave} disabled={saving} className="gap-1.5">
                    <Save className="w-4 h-4" /> {saving ? 'Guardando...' : 'Guardar'}
                  </Button>
                  <Button variant="outline" onClick={handleTest} disabled={testing || !webhookUrl} className="gap-1.5">
                    <Bell className="w-4 h-4" /> {testing ? 'Enviando...' : 'Enviar prueba'}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </FadeIn>

      <FadeIn delay={0.2}>
        <Card style={{ boxShadow: 'var(--shadow-sm)' }}>
          <CardHeader>
            <CardTitle className="text-base font-display flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-primary" /> Información del Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Calendario de pedidos</p>
                <ul className="mt-1 space-y-1">
                  <li className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-green-500" /> Lunes: pedido → entrega miércoles</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-green-500" /> Miércoles: pedido → entrega viernes</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-green-500" /> Jueves: pedido → entrega lunes siguiente</li>
                </ul>
              </div>
              <div>
                <p className="text-muted-foreground">Funcionalidades</p>
                <ul className="mt-1 space-y-1">
                  <li className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-green-500" /> Sugerencias basadas en histórico</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-green-500" /> Guardado automático de borradores</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-green-500" /> Copiar pedidos anteriores</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}
