import { NextRequest } from 'next/server';
import { CampanaController } from '@/lib/controllers/CatalogoController';

export const GET  = (req: NextRequest) => CampanaController.list(req);
export const POST = (req: NextRequest) => CampanaController.create(req);
