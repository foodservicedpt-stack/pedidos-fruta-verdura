'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft, Send, Copy, Download, CheckCircle, Calendar, User, Package,
  Edit3, Save, X, Trash2, ChevronDown, FileText, FileSpreadsheet,
  Upload, Loader2, ImageIcon, AlertCircle, Check, FileUp, AlertTriangle, Info,
  Search, ArrowRight, TrendingDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { FadeIn } from '@/components/ui/animate';
import { estadoLabel, estadoColor, tipoLabel, catIcons, type ScanFileEntry } from './pedido-detail-constants';
import { PedidoIncidencias } from './pedido-incidencias';

export function PedidoDetailClient({ pedidoId }: { pedidoId: string }) {
  const router = useRouter();
  const [pedido, setPedido] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [receiving, setReceiving] = useState(false);
  const [receivedQtys, setReceivedQtys] = useState<Record<number, number>>({});
  const [editing, setEditing] = useState(false);
  const [editQtys, setEditQtys] = useState<Record<number, number>>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const downloadMenuRef = useRef<HTMLDivElement>(null);
  const [scanFiles, setScanFiles] = useState<ScanFileEntry[]>([]);
  const [scanningActive, setScanningActive] = useState(false);
  const [scanExtras, setScanExtras] = useState<{ productoId: number; nombre: string; cantidad: number; unidad: string; categoria: string }[]>([]);
  const [scanUnknowns, setScanUnknowns] = useState<{ nombre: string; cantidad: number }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Feature A+C: Track products not found in any albarán and OCR completion
  const [notArrivedIds, setNotArrivedIds] = useState<Set<number>>(new Set());
  const [ocrDone, setOcrDone] = useState(false);

  // Merma tracking
  const [showMerma, setShowMerma] = useState(false);
  const [mermaValues, setMermaValues] = useState<Record<number, number>>({});
  const [savingMerma, setSavingMerma] = useState(false);

  // Feature B: All products for mapping unknowns
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [mappingSearch, setMappingSearch] = useState<Record<number, string>>({});

  // Group products by category for the mapping dropdown
  const productsByCategory = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    for (const p of allProducts) {
      const cat = p.categoria ?? 'Otros';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(p);
    }
    return grouped;
  }, [allProducts]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(e.target as Node)) {
        setShowDownloadMenu(false);
      }
    };
    if (showDownloadMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDownloadMenu]);

  useEffect(() => {
    const fetchPedido = async () => {
      try {
        const res = await fetch(`/api/pedidos/${pedidoId}`);
        if (res.ok) setPedido(await res.json());
        else toast.error('Pedido no encontrado');
      } catch (err: any) {
        console.error(err?.message);
      } finally {
        setLoading(false);
      }
    };
    fetchPedido();
  }, [pedidoId]);

  // Fetch all products when entering receiving mode (for mapping UI)
  useEffect(() => {
    if (receiving && allProducts.length === 0) {
      fetch('/api/productos')
        .then(r => r.json())
        .then(data => { if (Array.isArray(data)) setAllProducts(data); })
        .catch(() => {});
    }
  }, [receiving, allProducts.length]);

  const handleSend = async () => {
    try {
      const res = await fetch(`/api/pedidos/${pedidoId}/enviar`, { method: 'POST' });
      if (res.ok) {
        const updated = await res.json();
        setPedido(updated);
        toast.success('Pedido enviado');
      }
    } catch (err: any) {
      toast.error('Error al enviar');
    }
  };

  // Load merma values from existing data
  const initMerma = () => {
    const vals: Record<number, number> = {};
    for (const d of (pedido?.detalles ?? [])) {
      if (d.merma != null && d.merma > 0) vals[d.id] = d.merma;
    }
    setMermaValues(vals);
    setShowMerma(true);
  };

  const handleSaveMerma = async () => {
    setSavingMerma(true);
    try {
      const res = await fetch(`/api/pedidos/${pedidoId}/merma`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mermas: mermaValues }),
      });
      if (res.ok) {
        setPedido(await res.json());
        setShowMerma(false);
        toast.success('Merma registrada correctamente');
      } else {
        throw new Error('Error al guardar');
      }
    } catch (err: any) {
      toast.error('Error al guardar merma');
    } finally {
      setSavingMerma(false);
    }
  };

  // Start receiving mode - pre-fill with requested quantities
  const startReceiving = () => {
    const qtys: Record<number, number> = {};
    for (const d of (pedido?.detalles ?? [])) {
      qtys[d.id] = d.cantidadSolicitada ?? 0;
    }
    setReceivedQtys(qtys);
    setReceiving(true);
  };

  const handleConfirmReceived = async () => {
    try {
      const detalles = (pedido?.detalles ?? []).map((d: any) => ({
        productoId: d.productoId,
        cantidadSolicitada: d.cantidadSolicitada,
        cantidadRecibida: receivedQtys[d.id] ?? d.cantidadSolicitada,
        comentario: d.comentario,
      }));

      // Build noLlegaron data for products not found in any albarán
      const noLlegaron = (pedido?.detalles ?? [])
        .filter((d: any) => notArrivedIds.has(d.id))
        .map((d: any) => ({
          productoId: d.productoId,
          nombre: d.producto?.nombre ?? '',
          cantidadSolicitada: d.cantidadSolicitada,
          unidad: d.producto?.unidad ?? '',
          categoria: d.producto?.categoria ?? '',
        }));

      // Build extrasAlbaran data to persist
      const extrasData = (scanExtras.length > 0 || scanUnknowns.length > 0 || noLlegaron.length > 0) ? {
        extras: scanExtras.map(e => ({ productoId: e.productoId, nombre: e.nombre, cantidad: e.cantidad, unidad: e.unidad, categoria: e.categoria })),
        noRegistrados: scanUnknowns.map(u => ({ nombre: u.nombre, cantidad: u.cantidad })),
        noLlegaron,
      } : null;

      const res = await fetch(`/api/pedidos/${pedidoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'recibido', detalles, extrasAlbaran: extrasData }),
      });
      if (res.ok) {
        setPedido(await res.json());
        setReceiving(false);
        clearAllScanFiles();
        toast.success('Pedido marcado como recibido con las cantidades reales');
      }
    } catch (err: any) {
      toast.error('Error al confirmar recepción');
    }
  };

  const handleFilesSelected = async (files: FileList) => {
    const entries: ScanFileEntry[] = Array.from(files).map((file, i) => ({
      id: `${Date.now()}-${i}`,
      name: file.name,
      type: file.type === 'application/pdf' ? 'pdf' : 'image',
      file,
      status: 'pending' as const,
    }));
    setScanFiles(prev => [...prev, ...entries]);
    if (fileInputRef.current) fileInputRef.current.value = '';

    setScanningActive(true);
    let accQtys = { ...receivedQtys };
    let accExtras = [...scanExtras];
    let accUnknowns = [...scanUnknowns];
    // Track which productoIds were matched across ALL files (for Feature A)
    const matchedProductIds = new Set<number>();

    for (const entry of entries) {
      setScanFiles(prev => prev.map(f => f.id === entry.id ? { ...f, status: 'scanning' } : f));
      try {
        const formData = new FormData();
        formData.append('file', entry.file);
        const res = await fetch(`/api/pedidos/${pedidoId}/ocr`, {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error ?? 'Error al procesar');
        }
        const data = await res.json();
        const matches: Record<number, number> = data?.matches ?? {};

        // Accumulate matches and track matched productoIds
        for (const det of (pedido?.detalles ?? [])) {
          if (matches[det.productoId] !== undefined) {
            accQtys[det.id] = matches[det.productoId];
            matchedProductIds.add(det.productoId);
          }
        }
        setReceivedQtys({ ...accQtys });

        // Accumulate extras (products in DB but not in order)
        const fileExtras = data?.extras ?? [];
        for (const ex of fileExtras) {
          const existing = accExtras.find(e => e.productoId === ex.productoId);
          if (existing) {
            existing.cantidad = ex.cantidad;
          } else {
            accExtras.push({ ...ex });
          }
        }
        setScanExtras([...accExtras]);

        // Accumulate unknowns (products not in DB)
        const fileUnknowns = data?.unknowns ?? [];
        for (const unk of fileUnknowns) {
          const nameLC = (unk.nombre ?? '').toLowerCase().trim();
          if (!accUnknowns.some(u => (u.nombre ?? '').toLowerCase().trim() === nameLC)) {
            accUnknowns.push({ ...unk });
          }
        }
        setScanUnknowns([...accUnknowns]);

        setScanFiles(prev => prev.map(f => f.id === entry.id ? {
          ...f,
          status: 'done',
          matched: data?.totalMatched ?? 0,
          total: data?.totalExtracted ?? 0,
          notas: data?.notas ?? null,
          extras: fileExtras,
          unknowns: fileUnknowns,
        } : f));
      } catch (err: any) {
        setScanFiles(prev => prev.map(f => f.id === entry.id ? {
          ...f,
          status: 'error',
          error: err?.message ?? 'Error desconocido',
        } : f));
      }
    }

    // Feature A: Products in order not found in any albarán → set quantity to 0
    const notArrived = new Set<number>();
    for (const det of (pedido?.detalles ?? [])) {
      if (!matchedProductIds.has(det.productoId)) {
        accQtys[det.id] = 0;
        notArrived.add(det.id);
      }
    }
    setReceivedQtys({ ...accQtys });
    setNotArrivedIds(notArrived);
    setOcrDone(true);

    const matchedCount = matchedProductIds.size;
    const notArrivedCount = notArrived.size;
    let msg = `${entries.length} albarán(es) procesado(s)`;
    if (notArrivedCount > 0) {
      msg += ` · ⚠️ ${notArrivedCount} producto(s) del pedido no detectados en ningún albarán (cantidad → 0)`;
    }
    toast.success(msg);
    setScanningActive(false);
  };

  // Feature B: Map an unknown product to an existing product
  const handleMapUnknown = (unknownIndex: number, productoId: number) => {
    const unknown = scanUnknowns[unknownIndex];
    if (!unknown) return;

    const product = allProducts.find((p: any) => p.id === productoId);
    if (!product) return;

    // Check if product is in the order
    const orderDetail = (pedido?.detalles ?? []).find((d: any) => d.productoId === productoId);

    if (orderDetail) {
      // Product is in the order → update receivedQtys
      setReceivedQtys(prev => ({ ...prev, [orderDetail.id]: unknown.cantidad }));
      // Remove from notArrived if it was there
      setNotArrivedIds(prev => {
        const next = new Set(prev);
        next.delete(orderDetail.id);
        return next;
      });
      toast.success(`"${unknown.nombre}" asignado a "${product.nombre}" (del pedido)`);
    } else {
      // Product is in DB but not in order → add to extras
      setScanExtras(prev => {
        const existing = prev.find(e => e.productoId === productoId);
        if (existing) {
          return prev.map(e => e.productoId === productoId ? { ...e, cantidad: unknown.cantidad } : e);
        }
        return [...prev, {
          productoId: product.id,
          nombre: product.nombre,
          cantidad: unknown.cantidad,
          unidad: product.unidad ?? '',
          categoria: product.categoria ?? 'Otros',
        }];
      });
      toast.success(`"${unknown.nombre}" asignado a "${product.nombre}" (extra)`);
    }

    // Remove the unknown from list
    setScanUnknowns(prev => prev.filter((_, i) => i !== unknownIndex));
    // Clean search state
    setMappingSearch(prev => {
      const next = { ...prev };
      delete next[unknownIndex];
      return next;
    });
  };

  const removeScanFile = (id: string) => {
    setScanFiles(prev => prev.filter(f => f.id !== id));
  };

  const clearAllScanFiles = () => {
    setScanFiles([]);
    setScanExtras([]);
    setScanUnknowns([]);
    setNotArrivedIds(new Set());
    setOcrDone(false);
    setMappingSearch({});
  };

  // Start edit mode for sent orders
  const startEditing = () => {
    const qtys: Record<number, number> = {};
    for (const d of (pedido?.detalles ?? [])) {
      qtys[d.id] = d.cantidadSolicitada ?? 0;
    }
    setEditQtys(qtys);
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    setSavingEdit(true);
    try {
      const detalles = (pedido?.detalles ?? []).map((d: any) => ({
        productoId: d.productoId,
        cantidadSolicitada: editQtys[d.id] ?? d.cantidadSolicitada,
        cantidadRecibida: d.cantidadRecibida,
        comentario: d.comentario,
      }));

      const res = await fetch(`/api/pedidos/${pedidoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ detalles }),
      });
      if (res.ok) {
        setPedido(await res.json());
        setEditing(false);
        toast.success('Pedido actualizado');
      }
    } catch (err: any) {
      toast.error('Error al guardar cambios');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDownload = async (format: 'pdf' | 'excel' | 'word') => {
    setDownloading(format);
    setShowDownloadMenu(false);
    const extMap = { pdf: 'pdf', excel: 'xlsx', word: 'docx' };
    const labelMap = { pdf: 'PDF', excel: 'Excel', word: 'Word' };
    try {
      const res = await fetch(`/api/pedidos/${pedidoId}/${format}`);
      if (!res.ok) throw new Error(`Error generando ${labelMap[format]}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pedido-${pedidoId}.${extMap[format]}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${labelMap[format]} descargado`);
    } catch (err: any) {
      toast.error(`Error al descargar ${labelMap[format]}`);
    } finally {
      setDownloading(null);
    }
  };

  // Helper: get row color class for receiving mode
  const getReceivingRowClass = (d: any): string => {
    if (!receiving || !ocrDone) return '';
    const received = receivedQtys[d.id] ?? 0;
    const ordered = d?.cantidadSolicitada ?? 0;
    if (received > ordered) return 'bg-red-50 border-l-4 border-red-400';
    if (received < ordered) return 'bg-amber-50 border-l-4 border-amber-400';
    return '';
  };

  // Helper: get diff indicator for receiving mode
  const getDiffIndicator = (d: any) => {
    if (!receiving || !ocrDone) return null;
    const received = receivedQtys[d.id] ?? 0;
    const ordered = d?.cantidadSolicitada ?? 0;
    const diff = received - ordered;
    if (diff > 0) {
      return <span className="text-xs font-semibold text-red-600 whitespace-nowrap">▲ +{Number.isInteger(diff) ? diff : diff.toFixed(1)}</span>;
    }
    if (diff < 0) {
      if (notArrivedIds.has(d.id)) {
        return <span className="text-xs font-semibold text-red-600 whitespace-nowrap">⚠️ No llegó</span>;
      }
      return <span className="text-xs font-semibold text-amber-600 whitespace-nowrap">▼ {Number.isInteger(diff) ? diff : diff.toFixed(1)}</span>;
    }
    return <span className="text-xs font-semibold text-green-600 whitespace-nowrap">✓ OK</span>;
  };

  if (loading) {
    return <div className="p-4 lg:p-8 max-w-[1200px] mx-auto"><div className="animate-pulse space-y-4"><div className="h-8 bg-muted rounded w-48" /><div className="h-40 bg-muted rounded" /></div></div>;
  }

  if (!pedido) {
    return <div className="p-4 lg:p-8 max-w-[1200px] mx-auto text-center"><p className="text-muted-foreground">Pedido no encontrado</p></div>;
  }

  const byCategory: Record<string, any[]> = {};
  for (const d of (pedido?.detalles ?? [])) {
    const cat = d?.producto?.categoria ?? 'Otros';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(d);
  }

  return (
    <div className="p-4 lg:p-8 max-w-[1200px] mx-auto space-y-6">
      <FadeIn>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/pedidos">
              <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl font-bold tracking-tight">Pedido #{pedido?.id}</h1>
                <Badge className={estadoColor[pedido?.estado] ?? ''}>{estadoLabel[pedido?.estado] ?? pedido?.estado}</Badge>
              </div>
              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{pedido?.fechaPedido ? new Date(pedido.fechaPedido).toLocaleDateString('es-ES') : ''}</span>
                <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" />{pedido?.user?.name ?? 'Usuario'}</span>
                {pedido?.tipoPedido && <span>{tipoLabel[pedido?.tipoPedido] ?? pedido?.tipoPedido}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative" ref={downloadMenuRef}>
              <div className="flex">
                <Button variant="outline" size="sm" onClick={() => handleDownload('pdf')} disabled={!!downloading} className="gap-1.5 rounded-r-none border-r-0">
                  <Download className="w-4 h-4" /> {downloading ? 'Generando...' : 'Descargar'}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowDownloadMenu(!showDownloadMenu)} disabled={!!downloading} className="px-1.5 rounded-l-none">
                  <ChevronDown className="w-3.5 h-3.5" />
                </Button>
              </div>
              {showDownloadMenu && (
                <div className="absolute top-full left-0 mt-1 bg-card border rounded-lg shadow-lg z-50 min-w-[160px] py-1">
                  <button onClick={() => handleDownload('pdf')} className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent transition-colors">
                    <FileText className="w-4 h-4 text-red-500" /> PDF
                  </button>
                  <button onClick={() => handleDownload('excel')} className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent transition-colors">
                    <FileSpreadsheet className="w-4 h-4 text-green-600" /> Excel (.xlsx)
                  </button>
                  <button onClick={() => handleDownload('word')} className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent transition-colors">
                    <FileText className="w-4 h-4 text-blue-600" /> Word (.docx)
                  </button>
                </div>
              )}
            </div>
            <Link href={`/pedidos/nuevo?copiar=${pedido?.id}`}>
              <Button variant="outline" size="sm" className="gap-1.5"><Copy className="w-4 h-4" /> Copiar</Button>
            </Link>
            {(pedido?.estado === 'borrador' || pedido?.estado === 'enviado' || pedido?.estado === 'recibido') && !receiving && !editing && (
              <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:bg-destructive/10" onClick={async () => {
                if (!confirm('¿Eliminar este pedido? Esta acción no se puede deshacer.')) return;
                try {
                  const res = await fetch(`/api/pedidos/${pedido?.id}`, { method: 'DELETE' });
                  if (res.ok) {
                    toast.success('Pedido eliminado');
                    router.push('/pedidos');
                  } else {
                    toast.error('Error al eliminar');
                  }
                } catch { toast.error('Error al eliminar'); }
              }}>
                <Trash2 className="w-4 h-4" /> Eliminar
              </Button>
            )}
            {pedido?.estado === 'borrador' && (
              <Button size="sm" onClick={handleSend} className="gap-1.5"><Send className="w-4 h-4" /> Enviar</Button>
            )}
            {pedido?.estado === 'enviado' && !receiving && !editing && (
              <>
                <Button variant="outline" size="sm" onClick={startEditing} className="gap-1.5">
                  <Edit3 className="w-4 h-4" /> Modificar
                </Button>
                <Button size="sm" onClick={startReceiving} className="gap-1.5 bg-green-600 hover:bg-green-700">
                  <CheckCircle className="w-4 h-4" /> Recibir
                </Button>
              </>
            )}
          </div>
        </div>
      </FadeIn>

      {/* Receiving mode banner */}
      {receiving && (
        <Card className="border-green-300 bg-green-50" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-sm font-medium text-green-800">Modo recepción: ajusta las cantidades reales recibidas</p>
                <p className="text-xs text-green-600 mt-0.5">Introduce las cantidades manualmente o escanea uno o varios albaranes.</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { setReceiving(false); clearAllScanFiles(); }} className="gap-1">
                  <X className="w-3.5 h-3.5" /> Cancelar
                </Button>
                <Button size="sm" onClick={handleConfirmReceived} className="gap-1 bg-green-600 hover:bg-green-700">
                  <CheckCircle className="w-3.5 h-3.5" /> Confirmar recepción
                </Button>
              </div>
            </div>

            {/* Upload area */}
            <div className="pt-2 border-t border-green-200 space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = e.target.files;
                  if (files && files.length > 0) handleFilesSelected(files);
                }}
              />
              <div
                className="border-2 border-dashed border-green-300 rounded-lg p-4 text-center cursor-pointer hover:bg-green-100/50 transition-colors"
                onClick={() => !scanningActive && fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!scanningActive && e.dataTransfer.files.length > 0) handleFilesSelected(e.dataTransfer.files);
                }}
              >
                <FileUp className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-green-700">
                  {scanningActive ? 'Procesando archivos...' : 'Arrastra albaranes aquí o haz clic para seleccionar'}
                </p>
                <p className="text-xs text-green-500 mt-1">PDF o imágenes · Puedes subir varios a la vez</p>
              </div>

              {/* File list with per-file status */}
              {scanFiles.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-green-800">
                      {scanFiles.length} archivo{scanFiles.length !== 1 ? 's' : ''}
                      {scanFiles.filter(f => f.status === 'done').length > 0 && (
                        <span className="text-green-600 ml-1">
                          · {scanFiles.filter(f => f.status === 'done').length} completado{scanFiles.filter(f => f.status === 'done').length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </p>
                    {!scanningActive && scanFiles.length > 0 && (
                      <button onClick={clearAllScanFiles} className="text-xs text-green-600 hover:text-green-800 underline">
                        Limpiar lista
                      </button>
                    )}
                  </div>
                  <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                    {scanFiles.map((sf) => (
                      <div
                        key={sf.id}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all ${
                          sf.status === 'scanning' ? 'bg-white border border-green-300 shadow-sm' :
                          sf.status === 'done' ? 'bg-green-100/70 border border-green-200' :
                          sf.status === 'error' ? 'bg-red-50 border border-red-200' :
                          'bg-white/60 border border-green-200'
                        }`}
                      >
                        <div className="flex-shrink-0">
                          {sf.type === 'pdf' ? (
                            <FileText className="w-5 h-5 text-red-500" />
                          ) : (
                            <ImageIcon className="w-5 h-5 text-blue-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate text-green-900">{sf.name}</p>
                          {sf.status === 'done' && (
                            <p className="text-xs text-green-600">
                              {sf.matched} producto{sf.matched !== 1 ? 's' : ''} detectado{sf.matched !== 1 ? 's' : ''} de {sf.total} en albarán
                              {sf.notas && <span className="ml-1">· {sf.notas}</span>}
                            </p>
                          )}
                          {sf.status === 'error' && (
                            <p className="text-xs text-red-500">{sf.error}</p>
                          )}
                          {sf.status === 'pending' && (
                            <p className="text-xs text-gray-400">En cola...</p>
                          )}
                        </div>
                        <div className="flex-shrink-0">
                          {sf.status === 'scanning' && (
                            <Loader2 className="w-5 h-5 text-green-600 animate-spin" />
                          )}
                          {sf.status === 'done' && (
                            <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                              <Check className="w-3.5 h-3.5 text-white" />
                            </div>
                          )}
                          {sf.status === 'error' && (
                            <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                              <AlertCircle className="w-3.5 h-3.5 text-white" />
                            </div>
                          )}
                          {sf.status === 'pending' && (
                            <div className="w-5 h-5 rounded-full border-2 border-green-300" />
                          )}
                        </div>
                        {!scanningActive && (
                          <button onClick={() => removeScanFile(sf.id)} className="flex-shrink-0 text-gray-400 hover:text-red-500 transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Overall summary */}
                  {!scanningActive && scanFiles.some(f => f.status === 'done') && (
                    <div className="bg-green-100 rounded-lg px-3 py-2 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                      <p className="text-xs text-green-700">
                        Total: {scanFiles.filter(f => f.status === 'done').reduce((s, f) => s + (f.matched ?? 0), 0)} productos detectados.
                        Las cantidades se han rellenado automáticamente.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Feature A: Warning for products NOT found in any albarán */}
              {!scanningActive && ocrDone && notArrivedIds.size > 0 && (
                <div className="border-2 border-red-300 bg-red-50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-red-800">
                        ⚠️ {notArrivedIds.size} producto{notArrivedIds.size !== 1 ? 's' : ''} del pedido no detectado{notArrivedIds.size !== 1 ? 's' : ''} en ningún albarán
                      </p>
                      <p className="text-xs text-red-600 mt-0.5">La cantidad se ha puesto a 0 automáticamente. Puedes modificarla manualmente si lo necesitas.</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {(pedido?.detalles ?? []).filter((d: any) => notArrivedIds.has(d.id)).map((d: any) => {
                      const CatIcon = catIcons[d.producto?.categoria] ?? Package;
                      return (
                        <div key={d.id} className="flex items-center justify-between bg-white rounded-md px-3 py-2 border border-red-200">
                          <div className="flex items-center gap-2">
                            <CatIcon className="w-4 h-4 text-red-500" />
                            <span className="text-sm font-medium text-red-900">{d.producto?.nombre}</span>
                            <Badge variant="secondary" className="text-xs">{d.producto?.categoria}</Badge>
                          </div>
                          <div className="text-sm text-red-600">
                            <span className="line-through text-red-400 mr-2">Pedido: {d.cantidadSolicitada} {d.producto?.unidad}</span>
                            <span className="font-bold">→ 0</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Extras: products in DB but NOT in the order */}
              {!scanningActive && scanExtras.length > 0 && (
                <div className="border border-amber-300 bg-amber-50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <p className="text-sm font-medium text-amber-800">
                      Productos extra: no estaban en el pedido pero han llegado
                    </p>
                  </div>
                  <div className="space-y-1">
                    {scanExtras.map((ex) => {
                      const CatIcon = catIcons[ex.categoria] ?? Package;
                      return (
                        <div key={ex.productoId} className="flex items-center justify-between bg-white rounded-md px-3 py-2 border border-amber-200">
                          <div className="flex items-center gap-2">
                            <CatIcon className="w-4 h-4 text-amber-600" />
                            <span className="text-sm font-medium text-amber-900">{ex.nombre}</span>
                            <Badge variant="secondary" className="text-xs">{ex.categoria}</Badge>
                          </div>
                          <div className="text-sm font-mono font-semibold text-amber-700">
                            {ex.cantidad} {ex.unidad}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Feature B: Unknowns with mapping UI */}
              {!scanningActive && scanUnknowns.length > 0 && (
                <div className="border border-red-300 bg-red-50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-red-600 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-red-800">
                        Productos no reconocidos: puedes asignarlos a un producto del sistema
                      </p>
                      <p className="text-xs text-red-600 mt-0.5">
                        Si el proveedor usa un nombre diferente, selecciona el producto correcto para asignar la cantidad.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {scanUnknowns.map((unk, i) => {
                      const searchTerm = (mappingSearch[i] ?? '').toLowerCase();
                      const filteredProducts = searchTerm.length > 0
                        ? allProducts.filter((p: any) => p.nombre.toLowerCase().includes(searchTerm) || p.categoria.toLowerCase().includes(searchTerm))
                        : [];
                      return (
                        <div key={`${unk.nombre}-${i}`} className="bg-white rounded-lg border border-red-200 overflow-hidden">
                          <div className="flex items-center justify-between px-3 py-2">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-red-500" />
                              <span className="text-sm font-medium text-red-800">"{unk.nombre}"</span>
                              <span className="text-sm font-mono text-red-600">({unk.cantidad})</span>
                            </div>
                          </div>
                          <div className="px-3 pb-2">
                            <div className="flex items-center gap-2">
                              <div className="relative flex-1">
                                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                  type="text"
                                  placeholder="Buscar producto para asignar..."
                                  value={mappingSearch[i] ?? ''}
                                  onChange={e => setMappingSearch(prev => ({ ...prev, [i]: e.target.value }))}
                                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                />
                              </div>
                            </div>
                            {filteredProducts.length > 0 && (
                              <div className="mt-1.5 max-h-[150px] overflow-y-auto border border-gray-100 rounded-md divide-y">
                                {filteredProducts.slice(0, 10).map((p: any) => {
                                  const CatIcon = catIcons[p.categoria] ?? Package;
                                  const isInOrder = (pedido?.detalles ?? []).some((d: any) => d.productoId === p.id);
                                  return (
                                    <button
                                      key={p.id}
                                      onClick={() => handleMapUnknown(i, p.id)}
                                      className="flex items-center justify-between w-full px-3 py-1.5 text-sm hover:bg-green-50 transition-colors text-left"
                                    >
                                      <div className="flex items-center gap-2">
                                        <CatIcon className="w-3.5 h-3.5 text-muted-foreground" />
                                        <span className="font-medium">{p.nombre}</span>
                                        <span className="text-xs text-muted-foreground">({p.unidad})</span>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        {isInOrder && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">En pedido</Badge>}
                                        <ArrowRight className="w-3.5 h-3.5 text-green-600" />
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Editing mode banner */}
      {editing && (
        <Card className="border-blue-300 bg-blue-50" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-sm font-medium text-blue-800">Modo edición: modifica las cantidades del pedido enviado</p>
                <p className="text-xs text-blue-600 mt-0.5">Ajusta las cantidades que necesites cambiar.</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditing(false)} className="gap-1">
                  <X className="w-3.5 h-3.5" /> Cancelar
                </Button>
                <Button size="sm" onClick={handleSaveEdit} disabled={savingEdit} className="gap-1">
                  <Save className="w-3.5 h-3.5" /> {savingEdit ? 'Guardando...' : 'Guardar cambios'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feature C: Color legend when OCR is done */}
      {receiving && ocrDone && (
        <div className="flex flex-wrap items-center gap-4 px-2 text-xs">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-200 border border-red-400" /> Llegó más de lo pedido</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-200 border border-amber-400" /> Llegó menos de lo pedido</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-green-200 border border-green-400" /> Cantidad correcta</span>
        </div>
      )}

      {pedido?.notas && (
        <Card style={{ boxShadow: 'var(--shadow-sm)' }}>
          <CardContent className="p-4"><p className="text-sm"><strong>Notas:</strong> {pedido?.notas}</p></CardContent>
        </Card>
      )}

      {Object.entries(byCategory ?? {}).map(([cat, items]: [string, any[]]) => {
        const Icon = catIcons[cat] ?? Package;
        return (
          <FadeIn key={cat} delay={0.1}>
            <Card style={{ boxShadow: 'var(--shadow-sm)' }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-display flex items-center gap-2">
                  <Icon className="w-4 h-4 text-primary" /> {cat}
                  <Badge variant="secondary" className="text-xs">{(items ?? []).length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {(items ?? []).map((d: any) => (
                    <div key={d?.id} className={`flex items-center justify-between py-2.5 gap-3 rounded-md px-2 transition-colors ${getReceivingRowClass(d)}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{d?.producto?.nombre ?? 'Producto'}</p>
                          {receiving && ocrDone && notArrivedIds.has(d.id) && (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">No llegó</Badge>
                          )}
                        </div>
                        {d?.comentario && <p className="text-xs text-muted-foreground mt-0.5">{d?.comentario}</p>}
                      </div>
                      <div className="text-right flex items-center gap-3">
                        {receiving ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Pedido: {d?.cantidadSolicitada ?? 0}</span>
                            <Input
                              type="number"
                              min="0"
                              step={d?.producto?.unidad === 'Kg' ? '0.5' : '1'}
                              value={receivedQtys[d.id] ?? ''}
                              onChange={e => setReceivedQtys(prev => ({ ...prev, [d.id]: parseFloat(e.target.value) || 0 }))}
                              className="w-20 text-center h-8 font-mono"
                            />
                            <span className="text-xs text-muted-foreground w-8">{d?.producto?.unidad ?? ''}</span>
                            {getDiffIndicator(d)}
                          </div>
                        ) : editing ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="0"
                              step={d?.producto?.unidad === 'Kg' ? '0.5' : '1'}
                              value={editQtys[d.id] ?? ''}
                              onChange={e => setEditQtys(prev => ({ ...prev, [d.id]: parseFloat(e.target.value) || 0 }))}
                              className="w-20 text-center h-8 font-mono"
                            />
                            <span className="text-xs text-muted-foreground w-8">{d?.producto?.unidad ?? ''}</span>
                          </div>
                        ) : (
                          <div>
                            <p className="text-sm font-mono font-medium">{d?.cantidadSolicitada ?? 0} {d?.producto?.unidad ?? ''}</p>
                            {d?.cantidadRecibida !== null && d?.cantidadRecibida !== undefined && (
                              <p className={`text-xs mt-0.5 ${d.cantidadRecibida !== d.cantidadSolicitada ? 'text-amber-600 font-medium' : 'text-muted-foreground'}`}>
                                Recibido: {d?.cantidadRecibida} {d?.producto?.unidad ?? ''}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </FadeIn>
        );
      })}

      {/* Merma tracking section for received orders */}
      {!receiving && !editing && pedido?.estado === 'recibido' && (
        <FadeIn delay={0.18}>
          <Card className="border-purple-200" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-display flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-purple-600" />
                  Registro de Merma
                </CardTitle>
                {!showMerma ? (
                  <Button variant="outline" size="sm" onClick={initMerma} className="gap-1.5 text-purple-700 border-purple-300 hover:bg-purple-50">
                    <Edit3 className="w-3.5 h-3.5" />
                    {(pedido?.detalles ?? []).some((d: any) => d.merma != null && d.merma > 0) ? 'Editar merma' : 'Registrar merma'}
                  </Button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <Button variant="outline" size="sm" onClick={() => setShowMerma(false)} className="gap-1">
                      <X className="w-3.5 h-3.5" /> Cancelar
                    </Button>
                    <Button size="sm" onClick={handleSaveMerma} disabled={savingMerma} className="gap-1 bg-purple-600 hover:bg-purple-700">
                      {savingMerma ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      Guardar
                    </Button>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Registra los productos no utilizados o desperdiciados para llevar un control de las mermas
              </p>
            </CardHeader>
            {showMerma ? (
              <CardContent className="space-y-2">
                {(pedido?.detalles ?? []).filter((d: any) => (d.cantidadRecibida ?? d.cantidadSolicitada) > 0).map((d: any) => {
                  const CatIcon = catIcons[d?.producto?.categoria] ?? Package;
                  const recibido = d.cantidadRecibida ?? d.cantidadSolicitada;
                  return (
                    <div key={d.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-purple-50/50">
                      <CatIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm">{d?.producto?.nombre}</span>
                        <span className="text-xs text-muted-foreground ml-1.5">({recibido} {d?.producto?.unidad} recibidos)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="number"
                          min="0"
                          max={recibido}
                          step={d?.producto?.unidad === 'Kg' ? '0.5' : '1'}
                          value={mermaValues[d.id] ?? ''}
                          onChange={e => setMermaValues(prev => {
                            const val = parseFloat(e.target.value) || 0;
                            const next = { ...prev };
                            if (val <= 0) delete next[d.id];
                            else next[d.id] = Math.min(val, recibido);
                            return next;
                          })}
                          placeholder="0"
                          className="w-20 text-center h-8 font-mono text-purple-700"
                        />
                        <span className="text-xs text-muted-foreground w-8">{d?.producto?.unidad}</span>
                      </div>
                    </div>
                  );
                })}
                {Object.keys(mermaValues).length > 0 && (
                  <div className="mt-2 p-2 rounded-lg bg-purple-50 border border-purple-200 text-sm text-purple-800">
                    <p className="font-medium">Resumen: {Object.keys(mermaValues).length} producto{Object.keys(mermaValues).length !== 1 ? 's' : ''} con merma</p>
                  </div>
                )}
              </CardContent>
            ) : (
              <CardContent>
                {(() => {
                  const withMerma = (pedido?.detalles ?? []).filter((d: any) => d.merma != null && d.merma > 0);
                  if (withMerma.length === 0) return (
                    <p className="text-sm text-muted-foreground text-center py-2">No hay merma registrada para este pedido</p>
                  );
                  return (
                    <div className="space-y-1.5">
                      {withMerma.map((d: any) => {
                        const CatIcon = catIcons[d?.producto?.categoria] ?? Package;
                        const porcentaje = d.cantidadRecibida ? Math.round((d.merma / d.cantidadRecibida) * 100) : 0;
                        return (
                          <div key={d.id} className="flex items-center justify-between bg-purple-50 rounded-lg px-3 py-2 border border-purple-200">
                            <div className="flex items-center gap-2">
                              <CatIcon className="w-4 h-4 text-purple-600" />
                              <span className="text-sm font-medium">{d?.producto?.nombre}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-mono text-purple-700">{d.merma} {d?.producto?.unidad}</span>
                              {porcentaje > 0 && (
                                <Badge variant="outline" className={`text-xs ${porcentaje > 30 ? 'border-red-300 text-red-700' : porcentaje > 15 ? 'border-amber-300 text-amber-700' : 'border-purple-300 text-purple-700'}`}>
                                  {porcentaje}%
                                </Badge>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </CardContent>
            )}
          </Card>
        </FadeIn>
      )}

      {/* Incidencias persistidas del albarán (mostradas cuando el pedido está recibido) */}
      {!receiving && pedido?.estado === 'recibido' && pedido?.extrasAlbaran && (
        <PedidoIncidencias extrasAlbaran={pedido.extrasAlbaran} />
      )}
    </div>
  );
}
