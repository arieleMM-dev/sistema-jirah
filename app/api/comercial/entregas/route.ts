import { NextRequest } from 'next/server';
import { ComercialController } from '@/lib/controllers/ComercialController';
export const GET = ComercialController.list;
export const POST = (req: NextRequest) => ComercialController.create(req, 'entrega');
