import AgricultorDetailClient from './client';

export default async function AgricultorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AgricultorDetailClient id={id} />;
}
