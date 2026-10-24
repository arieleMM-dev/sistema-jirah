import { NextRequest } from 'next/server';
import { JornadaController } from '@/lib/controllers/JornadaController';
export const GET = (req: NextRequest) => JornadaController.list(req);
export const POST = (req: NextRequest) => JornadaController.classify(req);
