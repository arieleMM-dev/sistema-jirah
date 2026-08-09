import { NextRequest } from 'next/server';
import { LoteController } from '@/lib/controllers/CatalogoController';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  return LoteController.update(req, id);
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  return LoteController.remove(req, id);
}
