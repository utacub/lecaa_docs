import { describe, expect, it } from 'vitest';
import { matxaIds, matxaText, numberToCatalan } from '../src/speech/neural/catalog';

describe('Matxa text front-end', () => {
  it('writes numbers out in Catalan', () => {
    expect(numberToCatalan(21)).toBe('vint-i-un');
    expect(numberToCatalan(35)).toBe('trenta-cinc');
    expect(numberToCatalan(200)).toBe('dos-cents');
    expect(numberToCatalan(1999)).toBe('mil nou-cents noranta-nou');
    expect(numberToCatalan(2000000)).toBe('dos milions');
    expect(matxaText('Tinc 3 gats i 1.500 peixos, 2,5 kg.')).toBe('tinc tres gats i mil cinc-cents peixos, dos coma cinc kg.');
  });
  it('maps graphemes to ids interspersed with the pad symbol', () => {
    const ids = matxaIds('Hi');
    expect(ids.length).toBe(5);
    expect(ids.filter((_, i) => i % 2 === 0).every(x => x === 0)).toBe(true);
    expect(matxaIds("l'àvia").length).toBe(13);
  });
});
