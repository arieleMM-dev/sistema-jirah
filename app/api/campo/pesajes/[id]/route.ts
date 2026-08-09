import { NextRequest } from 'next/server';
import { PesajeController } from '@/lib/controllers/PesajeController';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  return PesajeController.get(req, id);
}
