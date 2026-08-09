// ============================================================
// PATRÓN STRATEGY — Fórmulas de cálculo intercambiables
// ============================================================
// Encapsula los algoritmos de validación de margen de error
// y cálculo de tara. Permite cambiar reglas sin tocar controladores.

export interface ICalculoMargenError {
  calcularMargen(pesoBruto: number, totalClasificado: number): number;
  estaDentroDelMargen(margenPct: number): boolean;
  getDescripcion(): string;
  getMargenPermitido(): number;
}

// ─────────────────────────────────────────────
// Estrategia concreta: Pitahaya Normal (±4%)
// ─────────────────────────────────────────────
export class CalculoMargenPitahayaNormalStrategy implements ICalculoMargenError {
  private readonly MARGEN_PERMITIDO = 4; // ±4%

  calcularMargen(pesoBruto: number, totalClasificado: number): number {
    if (pesoBruto === 0) return 0;
    return Math.abs(((pesoBruto - totalClasificado) / pesoBruto) * 100);
  }

  estaDentroDelMargen(margenPct: number): boolean {
    return margenPct <= this.MARGEN_PERMITIDO;
  }

  getDescripcion(): string {
    return 'Pitahaya Amarilla - Estándar Nacional (±4%)';
  }

  getMargenPermitido(): number {
    return this.MARGEN_PERMITIDO;
  }
}

// ─────────────────────────────────────────────
// Estrategia: Pitahaya Exportación Especial (±2%)
// Preparada para uso futuro según instrucciones.txt
// ─────────────────────────────────────────────
export class CalculoMargenPitahayaExportacionStrategy implements ICalculoMargenError {
  private readonly MARGEN_PERMITIDO = 2; // ±2%

  calcularMargen(pesoBruto: number, totalClasificado: number): number {
    if (pesoBruto === 0) return 0;
    return Math.abs(((pesoBruto - totalClasificado) / pesoBruto) * 100);
  }

  estaDentroDelMargen(margenPct: number): boolean {
    return margenPct <= this.MARGEN_PERMITIDO;
  }

  getDescripcion(): string {
    return 'Pitahaya Amarilla - Exportación Especial (±2%)';
  }

  getMargenPermitido(): number {
    return this.MARGEN_PERMITIDO;
  }
}

// ─────────────────────────────────────────────
// Calculador de Tara de Gavetas
// ─────────────────────────────────────────────
export interface ICalculoTara {
  calcularTara(numGavetas: number): number;
  getPesoGaveta(): number;
}

export class CalculoTaraGavetaStrategy implements ICalculoTara {
  private readonly PESO_GAVETA_KG: number;

  constructor(pesoGavetaKg: number = 1.70) {
    this.PESO_GAVETA_KG = pesoGavetaKg;
  }

  calcularTara(numGavetas: number): number {
    return numGavetas * this.PESO_GAVETA_KG;
  }

  getPesoGaveta(): number {
    return this.PESO_GAVETA_KG;
  }
}

// ─────────────────────────────────────────────
// Contexto del Patrón Strategy
// ─────────────────────────────────────────────
export class CalculadoraCosecha {
  private estrategiaMargen: ICalculoMargenError;
  private estrategiaTara: ICalculoTara;

  constructor(
    estrategiaMargen: ICalculoMargenError = new CalculoMargenPitahayaNormalStrategy(),
    estrategiaTara: ICalculoTara = new CalculoTaraGavetaStrategy()
  ) {
    this.estrategiaMargen = estrategiaMargen;
    this.estrategiaTara = estrategiaTara;
  }

  // Permite cambiar estrategia en tiempo de ejecución
  setEstrategiaMargen(estrategia: ICalculoMargenError) {
    this.estrategiaMargen = estrategia;
  }

  setEstrategiaTara(estrategia: ICalculoTara) {
    this.estrategiaTara = estrategia;
  }

  calcularPesaje(pesoBrutoKg: number, numGavetas: number) {
    const taraTotal = this.estrategiaTara.calcularTara(numGavetas);
    const pesoNetoKg = pesoBrutoKg - taraTotal;
    return { taraTotal, pesoNetoKg };
  }

  validarClasificacion(pesoBrutoKg: number, totalClasificadoKg: number) {
    const margenPct = this.estrategiaMargen.calcularMargen(pesoBrutoKg, totalClasificadoKg);
    const dentroDelMargen = this.estrategiaMargen.estaDentroDelMargen(margenPct);
    return {
      margenPct,
      dentroDelMargen,
      margenPermitido: this.estrategiaMargen.getMargenPermitido(),
    };
  }
}
