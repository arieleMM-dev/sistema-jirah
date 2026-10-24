import { AccesoController } from '@/lib/controllers/AccesoController';
import type { NextRequest } from 'next/server';
export const GET = (request: NextRequest) => AccesoController.solicitudes(request);
export const POST = (request: NextRequest) => AccesoController.solicitudes(request);
