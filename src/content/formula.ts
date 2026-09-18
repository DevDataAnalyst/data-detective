/**
 * A tiny, safe arithmetic language for content: numbers, names, + − × ÷ and ^, brackets, and the
 * functions sqrt, abs, min, max and phi (the standard normal CDF). Probability and A/B testing
 * answers are recomputed with it, so content never has to be trusted to do its own sums.
 */
import { normalCdf } from '../game/stats';

type Token =
  | { kind: 'number'; value: number }
  | { kind: 'name'; name: string }
  | { kind: 'symbol'; symbol: string };

const FUNCTIONS: Record<string, (...args: number[]) => number> = {
  sqrt: Math.sqrt,
  abs: Math.abs,
  min: Math.min,
  max: Math.max,
  phi: normalCdf,
};

function tokenize(formula: string): Token[] {
  const tokens: Token[] = [];
  const pattern = /\s*(?:(\d+(?:\.\d+)?|\.\d+)|([a-z_][a-z0-9_]*)|([-+*/^(),]))/gy;
  let index = 0;
  while (index < formula.length) {
    if (!formula.slice(index).trim()) break;
    pattern.lastIndex = index;
    const match = pattern.exec(formula);
    if (!match) throw new Error(`cannot read “${formula.slice(index).trim()}”`);
    if (match[1] !== undefined) tokens.push({ kind: 'number', value: Number(match[1]) });
    else if (match[2] !== undefined) tokens.push({ kind: 'name', name: match[2] });
    else tokens.push({ kind: 'symbol', symbol: match[3] });
    index = pattern.lastIndex;
  }
  return tokens;
}

/** Every name a formula uses, other than functions. */
export function formulaNames(formula: string): string[] {
  const tokens = tokenize(formula);
  return tokens.flatMap((token, index) => {
    if (token.kind !== 'name') return [];
    const next = tokens[index + 1];
    const isCall = next?.kind === 'symbol' && next.symbol === '(' && token.name in FUNCTIONS;
    return isCall ? [] : [token.name];
  });
}

/** Evaluates a formula. Names come from `scope`; an unknown name or a stray symbol throws. */
export function evaluateFormula(formula: string, scope: Readonly<Record<string, number>>): number {
  const tokens = tokenize(formula);
  let position = 0;
  const peek = () => tokens[position];
  const isSymbol = (symbol: string) => {
    const token = peek();
    return token?.kind === 'symbol' && token.symbol === symbol;
  };
  const expect = (symbol: string) => {
    if (!isSymbol(symbol)) throw new Error(`expected “${symbol}”`);
    position += 1;
  };

  const expression = (): number => {
    let value = term();
    while (isSymbol('+') || isSymbol('-')) {
      const add = isSymbol('+');
      position += 1;
      value = add ? value + term() : value - term();
    }
    return value;
  };
  const term = (): number => {
    let value = power();
    while (isSymbol('*') || isSymbol('/')) {
      const multiply = isSymbol('*');
      position += 1;
      value = multiply ? value * power() : value / power();
    }
    return value;
  };
  const power = (): number => {
    const base = unary();
    if (!isSymbol('^')) return base;
    position += 1;
    return base ** power();
  };
  const unary = (): number => {
    if (isSymbol('-')) {
      position += 1;
      return -unary();
    }
    return primary();
  };
  const primary = (): number => {
    const token = peek();
    if (!token) throw new Error('the formula ends too soon');
    position += 1;
    if (token.kind === 'number') return token.value;
    if (token.kind === 'symbol') {
      if (token.symbol !== '(') throw new Error(`unexpected “${token.symbol}”`);
      const value = expression();
      expect(')');
      return value;
    }
    if (isSymbol('(')) {
      const fn = FUNCTIONS[token.name];
      if (!fn) throw new Error(`unknown function “${token.name}”`);
      position += 1;
      const args = [expression()];
      while (isSymbol(',')) {
        position += 1;
        args.push(expression());
      }
      expect(')');
      return fn(...args);
    }
    if (!(token.name in scope)) throw new Error(`unknown name “${token.name}”`);
    return scope[token.name];
  };

  const value = expression();
  if (position < tokens.length) throw new Error('has something left over after the formula');
  return value;
}
