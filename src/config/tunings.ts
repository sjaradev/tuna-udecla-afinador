/**
 * Afinaciones de los instrumentos, de grave a agudo.
 * Las frecuencias NO se escriben aquí: se calculan desde A4 (ver dsp/music.ts).
 */

export const GUITARRA_TUNING = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'] as const;

/** 6 órdenes dobles (2 cuerdas al unísono por orden). */
export const BANDURRIA_TUNING = ['G#3', 'C#4', 'F#4', 'B4', 'E5', 'A5'] as const;

/** 6 órdenes dobles (2 cuerdas al unísono por orden). */
export const LAUD_TUNING = ['G#2', 'C#3', 'F#3', 'B3', 'E4', 'A4'] as const;

/**
 * ⚠ AFINACIÓN DEL GUITARRÓN
 * La Tuna puede usar otra variante. Para cambiarla, modifica SOLO esta
 * constante (grave → agudo); el resto de la app la toma desde aquí.
 */
export const GUITARRON_TUNING = ['A1', 'D2', 'G2', 'C3', 'E3', 'A2'] as const;
