import { NextRequest } from 'next/server';
import { PesajeController } from '@/lib/controllers/PesajeController';

export const GET  = (req: NextRequest) => PesajeController.list(req);
export const POST = (req: NextRequest) => PesajeController.create(req);
