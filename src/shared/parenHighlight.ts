/**
 * WienerCalc — Análisis estructural de paréntesis para el editor de fórmulas.
 *
 * Puramente funcional (sin React) para que se pueda probar con datos reales:
 * dado un texto, indica para cada paréntesis su nivel de anidamiento y si
 * tiene pareja. La interfaz lo usa para colorear cada nivel con un color
 * distinto ("rainbow parens") y marcar en rojo los que no cierran — así se
 * ve de un vistazo qué pasa cuando hay paréntesis dentro de paréntesis,
 * en vez de tener que confiar en un mensaje de error después de ejecutar.
 */

export interface ParenToken {
  /** Posición del carácter dentro del texto. */
  index: number;
  char: '(' | ')';
  /** false si este paréntesis no tiene pareja (sobra o falta cerrar). */
  matched: boolean;
  /** Nivel de anidamiento (0 = el más externo). Sólo tiene sentido si matched es true. */
  depth: number;
}

/**
 * Recorre el texto y determina, para cada paréntesis, su nivel de
 * anidamiento y si está correctamente emparejado.
 */
export function analyzeParens(text: string): ParenToken[] {
  const tokens: ParenToken[] = [];
  // Pila de índices dentro de `tokens` que corresponden a "(" aún sin cerrar.
  const openStack: number[] = [];
  let depth = 0;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (ch === '(') {
      const tokenIndex = tokens.length;
      tokens.push({ index: i, char: '(', matched: false, depth });
      openStack.push(tokenIndex);
      depth++;
    } else if (ch === ')') {
      if (openStack.length === 0) {
        // Paréntesis de cierre sin apertura previa: se queda marcado como no emparejado.
        tokens.push({ index: i, char: ')', matched: false, depth: 0 });
      } else {
        depth = Math.max(0, depth - 1);
        const openTokenIndex = openStack.pop() as number;
        tokens[openTokenIndex].matched = true;
        tokens[openTokenIndex].depth = depth;
        tokens.push({ index: i, char: ')', matched: true, depth });
      }
    }
  }

  // Los que quedan en la pila al terminar son aperturas que nunca se cerraron:
  // conservan matched:false, que es justamente lo que queremos señalar.
  return tokens;
}

/** true si el texto tiene el mismo número de "(" y ")" y en el orden correcto. */
export function parensAreBalanced(text: string): boolean {
  return analyzeParens(text).every((t) => t.matched);
}
