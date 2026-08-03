/**
 * WienerCalc — Evaluador de fórmulas seguro.
 *
 * Sustituye al `new Function(...)` anterior, que (a) ejecutaba código
 * arbitrario con permisos completos de Node desde un perfil .json y
 * (b) devolvía 0 en silencio ante cualquier error, convirtiendo un typo
 * en una columna entera de ceros con aspecto de dato válido.
 *
 * Ahora la gramática es cerrada (aritmética + lista blanca de funciones),
 * la fórmula se compila UNA vez y se evalúa por fila, y cualquier problema
 * se reporta con un mensaje legible y sugerencia de la columna más parecida.
 */

import { parseSafeNumber } from './csv.ts';

export interface FormulaResult {
  value: number | null;
  error?: string;
  /** Columnas referenciadas que no existían en esta fila (se tomaron como 0). */
  missing?: string[];
}

/** Funciones permitidas dentro de una fórmula. */
const FUNCTIONS: Record<string, (args: number[]) => number> = {
  abs: (a) => Math.abs(a[0]),
  min: (a) => Math.min(...a),
  max: (a) => Math.max(...a),
  round: (a) => (a.length > 1 ? Math.round(a[0] * 10 ** a[1]) / 10 ** a[1] : Math.round(a[0])),
  floor: (a) => Math.floor(a[0]),
  ceil: (a) => Math.ceil(a[0]),
  sqrt: (a) => Math.sqrt(a[0]),
  pow: (a) => Math.pow(a[0], a[1]),
  ln: (a) => Math.log(a[0]),
  log: (a) => Math.log10(a[0]),
  exp: (a) => Math.exp(a[0]),
  if: (a) => (a[0] ? a[1] : a[2])
};

export const ALLOWED_FUNCTIONS = Object.keys(FUNCTIONS);

const PH_START = '\u0001';
const PH_END = '\u0002';

/* ------------------------------------------------------------------ */
/* Compilación                                                         */
/* ------------------------------------------------------------------ */

export interface CompiledFormula {
  /** Nombres de columna referenciados, en orden de índice de variable. */
  variables: string[];
  /** Mensaje de error de compilación; si existe, la fórmula no es usable. */
  error?: string;
  /** Evalúa la fórmula compilada sobre una fila. */
  evaluate: (context: Record<string, unknown>) => FormulaResult;
}

/**
 * Compila una expresión contra el universo de columnas disponible.
 * Debe llamarse UNA vez por regla, no una vez por fila.
 */
export function compileFormula(expression: string, availableKeys: string[]): CompiledFormula {
  const fail = (error: string): CompiledFormula => ({
    variables: [],
    error,
    evaluate: () => ({ value: null, error })
  });

  if (!expression || typeof expression !== 'string' || expression.trim() === '') {
    return fail('La fórmula está vacía.');
  }

  const { rest, used } = substituteKeys(expression, availableKeys);

  // Lo que quede con pinta de identificador y no sea función permitida es un error.
  const identifierRe = /(?<![A-Za-zÀ-ÿ0-9_])[A-Za-zÀ-ÿ_][A-Za-zÀ-ÿ0-9_]*/g;
  const unknown: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = identifierRe.exec(rest)) !== null) {
    const name = match[0];
    if (FUNCTIONS[name.toLowerCase()]) continue;
    if (!unknown.includes(name)) unknown.push(name);
  }

  if (unknown.length > 0) {
    const messages = unknown.map((name) => {
      const suggestion = suggestColumn(name, availableKeys);
      return suggestion ? `«${name}» (¿querías decir «${suggestion}»?)` : `«${name}»`;
    });
    return fail(`Variable no encontrada: ${messages.join(', ')}.`);
  }

  let tokens: Token[];
  try {
    tokens = tokenize(rest);
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Fórmula inválida.');
  }

  // Verificación sintáctica con todas las variables valiendo 1.
  try {
    const probe = new Parser(tokens, used.map(() => 1));
    probe.parseExpression();
    probe.expectEnd();
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Fórmula inválida.');
  }

  const evaluate = (context: Record<string, unknown>): FormulaResult => {
    const values: number[] = [];
    const missing: string[] = [];
    for (const key of used) {
      const num = parseSafeNumber(context[key]);
      if (num === null) { missing.push(key); values.push(0); }
      else values.push(num);
    }

    try {
      const parser = new Parser(tokens, values);
      const value = parser.parseExpression();
      parser.expectEnd();
      if (!Number.isFinite(value)) {
        return { value: null, error: 'El resultado no es un número finito.', missing: missing.length ? missing : undefined };
      }
      return { value: Number(value.toFixed(6)), missing: missing.length ? missing : undefined };
    } catch (err) {
      return { value: null, error: err instanceof Error ? err.message : 'Fórmula inválida.' };
    }
  };

  return { variables: used, evaluate };
}

/** Atajo de un solo uso (pruebas y validación en la interfaz). */
export function evaluateFormula(expression: string, context: Record<string, unknown>): FormulaResult {
  const numericKeys = Object.keys(context).filter((k) => parseSafeNumber(context[k]) !== null);
  return compileFormula(expression, numericKeys).evaluate(context);
}

/** Valida sin ejecutar. Devuelve el mensaje de error o null si es correcta. */
export function validateFormula(expression: string, availableKeys: string[]): string | null {
  return compileFormula(expression, availableKeys).error ?? null;
}

/* ------------------------------------------------------------------ */
/* Sustitución de nombres de columna                                   */
/* ------------------------------------------------------------------ */

function substituteKeys(expression: string, keys: string[]): { rest: string; used: string[] } {
  // Los nombres más largos primero, para que `vitaA(UI)` gane a `vitaA`.
  const sorted = [...keys]
    .filter((k) => k !== '' && /[A-Za-zÀ-ÿ_]/.test(k)) // ignora columnas sin letras
    .sort((a, b) => b.length - a.length);

  const used: string[] = [];
  let rest = expression;

  for (const key of sorted) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const isPureIdentifier = /^[A-Za-zÀ-ÿ_$][A-Za-zÀ-ÿ0-9_$]*$/.test(key);
    const pattern = isPureIdentifier
      ? new RegExp(`(?<![A-Za-zÀ-ÿ0-9_$])${escaped}(?![A-Za-zÀ-ÿ0-9_$])`, 'g')
      : new RegExp(escaped, 'g');

    if (!pattern.test(rest)) continue;
    const index = used.length;
    used.push(key);
    rest = rest.replace(pattern, `${PH_START}${index}${PH_END}`);
  }

  return { rest, used };
}

/** Distancia de Levenshtein, para sugerir "¿querías decir...?" */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const curr: number[] = [i];
    for (let j = 1; j <= n; j++) {
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = curr;
  }
  return prev[n];
}

export function suggestColumn(name: string, candidates: string[]): string | null {
  let best: string | null = null;
  let bestDistance = Infinity;
  const lower = name.toLowerCase();
  for (const candidate of candidates) {
    const d = levenshtein(lower, candidate.toLowerCase());
    if (d < bestDistance) { bestDistance = d; best = candidate; }
  }
  const threshold = Math.max(2, Math.floor(name.length / 2));
  return bestDistance <= threshold ? best : null;
}

/* ------------------------------------------------------------------ */
/* Tokenizador + parser descendente recursivo                          */
/* ------------------------------------------------------------------ */

type Token =
  | { kind: 'num'; value: number }
  | { kind: 'var'; index: number }
  | { kind: 'fn'; name: string }
  | { kind: 'op'; value: string };

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    const ch = input[i];

    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') { i++; continue; }

    if (ch === PH_START) {
      const end = input.indexOf(PH_END, i);
      if (end === -1) throw new Error('Fórmula inválida (marcador de variable sin cerrar).');
      tokens.push({ kind: 'var', index: Number(input.slice(i + 1, end)) });
      i = end + 1;
      continue;
    }

    if (/[0-9.]/.test(ch)) {
      let j = i;
      while (j < input.length && /[0-9.]/.test(input[j])) j++;
      if (input[j] === 'e' || input[j] === 'E') {
        let k = j + 1;
        if (input[k] === '+' || input[k] === '-') k++;
        if (/[0-9]/.test(input[k] ?? '')) {
          j = k;
          while (j < input.length && /[0-9]/.test(input[j])) j++;
        }
      }
      const raw = input.slice(i, j);
      const num = Number(raw);
      if (!Number.isFinite(num)) throw new Error(`Número inválido en la fórmula: «${raw}».`);
      tokens.push({ kind: 'num', value: num });
      i = j;
      continue;
    }

    if (/[A-Za-zÀ-ÿ_]/.test(ch)) {
      let j = i;
      while (j < input.length && /[A-Za-zÀ-ÿ0-9_]/.test(input[j])) j++;
      const original = input.slice(i, j);
      const name = original.toLowerCase();
      if (!FUNCTIONS[name]) {
        throw new Error(
          `Variable o función desconocida: «${original}». Funciones permitidas: ${ALLOWED_FUNCTIONS.join(', ')}.`
        );
      }
      tokens.push({ kind: 'fn', name });
      i = j;
      continue;
    }

    const two = input.slice(i, i + 2);
    if (['<=', '>=', '==', '!=', '&&', '||'].includes(two)) {
      tokens.push({ kind: 'op', value: two });
      i += 2;
      continue;
    }

    if ('+-*/%^(),<>!'.includes(ch)) {
      tokens.push({ kind: 'op', value: ch });
      i++;
      continue;
    }

    throw new Error(`Carácter no permitido en la fórmula: «${ch}».`);
  }

  return tokens;
}

class Parser {
  private tokens: Token[];
  private values: number[];
  private pos = 0;

  constructor(tokens: Token[], values: number[]) {
    this.tokens = tokens;
    this.values = values;
  }

  private peek(): Token | undefined { return this.tokens[this.pos]; }

  private eatOp(...ops: string[]): string | null {
    const token = this.peek();
    if (token && token.kind === 'op' && ops.includes(token.value)) {
      this.pos++;
      return token.value;
    }
    return null;
  }

  expectEnd(): void {
    if (this.pos < this.tokens.length) throw new Error('Sobran símbolos al final de la fórmula.');
  }

  parseExpression(): number { return this.parseLogical(); }

  private parseLogical(): number {
    let left = this.parseComparison();
    let op = this.eatOp('&&', '||');
    while (op) {
      const right = this.parseComparison();
      left = op === '&&' ? (left && right ? 1 : 0) : (left || right ? 1 : 0);
      op = this.eatOp('&&', '||');
    }
    return left;
  }

  private parseComparison(): number {
    let left = this.parseAdditive();
    let op = this.eatOp('<', '>', '<=', '>=', '==', '!=');
    while (op) {
      const right = this.parseAdditive();
      if (op === '<') left = left < right ? 1 : 0;
      else if (op === '>') left = left > right ? 1 : 0;
      else if (op === '<=') left = left <= right ? 1 : 0;
      else if (op === '>=') left = left >= right ? 1 : 0;
      else if (op === '==') left = left === right ? 1 : 0;
      else left = left !== right ? 1 : 0;
      op = this.eatOp('<', '>', '<=', '>=', '==', '!=');
    }
    return left;
  }

  private parseAdditive(): number {
    let left = this.parseMultiplicative();
    let op = this.eatOp('+', '-');
    while (op) {
      const right = this.parseMultiplicative();
      left = op === '+' ? left + right : left - right;
      op = this.eatOp('+', '-');
    }
    return left;
  }

  private parseMultiplicative(): number {
    let left = this.parseUnary();
    let op = this.eatOp('*', '/', '%');
    while (op) {
      const right = this.parseUnary();
      if ((op === '/' || op === '%') && right === 0) throw new Error('División por cero en la fórmula.');
      if (op === '*') left = left * right;
      else if (op === '/') left = left / right;
      else left = left % right;
      op = this.eatOp('*', '/', '%');
    }
    return left;
  }

  private parseUnary(): number {
    const op = this.eatOp('+', '-', '!');
    if (op === '-') return -this.parseUnary();
    if (op === '+') return this.parseUnary();
    if (op === '!') return this.parseUnary() ? 0 : 1;
    return this.parsePower();
  }

  private parsePower(): number {
    const base = this.parsePrimary();
    if (this.eatOp('^')) return Math.pow(base, this.parseUnary());
    return base;
  }

  private parsePrimary(): number {
    const token = this.peek();
    if (!token) throw new Error('La fórmula termina de forma inesperada.');

    if (token.kind === 'num') { this.pos++; return token.value; }

    if (token.kind === 'var') {
      this.pos++;
      const value = this.values[token.index];
      if (value === undefined) throw new Error('Referencia de variable inválida.');
      return value;
    }

    if (token.kind === 'fn') {
      this.pos++;
      if (!this.eatOp('(')) throw new Error(`Falta «(» tras la función «${token.name}».`);
      const args: number[] = [];
      if (!this.eatOp(')')) {
        do { args.push(this.parseExpression()); } while (this.eatOp(','));
        if (!this.eatOp(')')) throw new Error(`Falta «)» al cerrar «${token.name}».`);
      }
      return FUNCTIONS[token.name](args);
    }

    if (token.kind === 'op' && token.value === '(') {
      this.pos++;
      const value = this.parseExpression();
      if (!this.eatOp(')')) throw new Error('Falta un paréntesis de cierre «)».');
      return value;
    }

    const shown: string = (token as { value?: string }).value ?? 'símbolo';
    throw new Error(`Símbolo inesperado en la fórmula: «${shown}».`);
  }
}
