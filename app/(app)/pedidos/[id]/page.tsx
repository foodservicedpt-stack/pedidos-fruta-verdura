import { PedidoDetailClient } from './_components/pedido-detail-client';

export default function PedidoDetailPage({ params }: { params: { id: string } }) {
  return <PedidoDetailClient pedidoId={params?.id ?? '0'} />;
}
