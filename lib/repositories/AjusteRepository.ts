/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CAPA DE DATOS — AjusteRepository                           ║
 * ║  Arquitectura de Tres Capas: Capa 3 (Datos)                 ║
 * ║                                                             ║
 * ║  Acceso a AjusteComprador vía Prisma.                       ║
 * ║  NO contiene reglas de negocio.                             ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import { prisma } from '@/lib/prisma';

export const AjusteRepo = {
  async findAll() {
    return prisma.ajusteComprador.findMany({
      include: {
        clasificacion: {
          include: {
            pesajeBruto: {
              include: {
                campana: { select: { codigo: true, nombre: true } },
                lote: { select: { codigo: true, nombre: true } },
              },
            },
          },
        },
        comprador: { select: { id: true, nombre: true, tipo: true } },
      },
      orderBy: { fechaRegistro: 'desc' },
    });
  },

  async findById(id: string) {
    return prisma.ajusteComprador.findUnique({
      where: { id },
      include: {
        clasificacion: {
          include: {
            pesajeBruto: {
              include: {
                campana: true,
                lote: true,
                agricultor: { select: { nombres: true, apellidos: true } },
              },
            },
          },
        },
        comprador: true,
      },
    });
  },

  async findByClasificacion(clasificacionId: string) {
    return prisma.ajusteComprador.findUnique({
      where: { clasificacionId },
    });
  },

  async create(data: {
    pesoRechazado: number;
    motivoRechazo?: string;
    ajusteKg: number;
    observaciones?: string;
    clasificacionId: string;
    compradorId: string;
  }) {
    return prisma.ajusteComprador.create({
      data,
      include: {
        clasificacion: {
          include: {
            pesajeBruto: {
              include: {
                campana: { select: { codigo: true } },
                lote: { select: { codigo: true, nombre: true } },
              },
            },
          },
        },
        comprador: { select: { id: true, nombre: true } },
      },
    });
  },
};
