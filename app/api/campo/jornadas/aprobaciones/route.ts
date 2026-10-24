import { NextRequest } from 'next/server';
import { JornadaController } from '@/lib/controllers/JornadaController';
export const POST = (req: NextRequest) => JornadaController.approve(req);
