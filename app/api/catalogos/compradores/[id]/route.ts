import { NextRequest } from 'next/server';
import { CompradorController } from '@/lib/controllers/CatalogoController';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  return CompradorController.update(req, id);
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  return CompradorController.remove(req, id);
}
