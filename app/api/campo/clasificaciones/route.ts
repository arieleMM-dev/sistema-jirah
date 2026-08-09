import { NextRequest } from 'next/server';
import { ClasificacionController } from '@/lib/controllers/PesajeController';

export const GET  = (req: NextRequest) => ClasificacionController.listPendientes(req);
export const POST = (req: NextRequest) => ClasificacionController.create(req);
