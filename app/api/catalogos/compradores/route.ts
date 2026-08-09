import { NextRequest } from 'next/server';
import { CompradorController } from '@/lib/controllers/CatalogoController';

export const GET  = (req: NextRequest) => CompradorController.list(req);
export const POST = (req: NextRequest) => CompradorController.create(req);
