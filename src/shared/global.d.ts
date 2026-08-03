/**
 * Declaración global de `window.wienerApi`.
 *
 * Vive aquí y no en `src/preload/preload.d.ts` porque TypeScript excluye
 * automáticamente los `.d.ts` que comparten nombre con un `.ts` incluido
 * (los toma por archivos de salida), y por eso la declaración no llegaba
 * a aplicarse en la interfaz.
 */

import type { WienerApi } from './api.ts';

declare global {
  interface Window {
    wienerApi: WienerApi;
  }
}

export {};
