/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CAPA DE PRESENTACIÓN — Route Handler /api/campo/ajustes    ║
 * ║  Arquitectura de Tres Capas: Capa 1 (Presentación)          ║
 * ║                                                             ║
 * ║  CU-05.3: Registrar ajuste de comprador.                    ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import { NextRequest } from 'next/server';
import { AjusteController } from '@/lib/controllers/AjusteController';

export const GET  = (req: NextRequest) => AjusteController.list(req);
export const POST = (req: NextRequest) => AjusteController.create(req);
