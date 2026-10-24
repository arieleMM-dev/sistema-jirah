import { NextRequest } from 'next/server';
import { SyncController } from '@/lib/controllers/SyncController';

export function POST(req: NextRequest) {
  return SyncController.sync(req, 'pesajes');
}