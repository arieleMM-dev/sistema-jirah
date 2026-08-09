import { NextRequest } from 'next/server';
import { LoteController } from '@/lib/controllers/CatalogoController';

export const GET  = (req: NextRequest) => LoteController.list(req);
export const POST = (req: NextRequest) => LoteController.create(req);
