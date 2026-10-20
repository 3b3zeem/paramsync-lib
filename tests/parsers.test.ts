import { describe, it, expect } from 'vitest';
import {
  parseAsString,
  parseAsInteger,
  parseAsFloat,
  parseAsBoolean,
  parseAsArray,
  parseAsNumberRange,
  parseAsSort,
  areValuesEqual,
  isCleanValue,
  createParser,
} from '../src/parsers';

describe('src/parsers.ts', () => {
  describe('parseAsString', () => {
    it('parses raw string or returns null', () => {
      expect(parseAsString.parse('hello')).toBe('hello');
      expect(parseAsString.parse(null)).toBeNull();
      expect(parseAsString.parse('')).toBe('');
    });

    it('supports withDefault', () => {
      const withDef = parseAsString.withDefault('default-query');
      expect(withDef.parse(null)).toBe('default-query');
      expect(withDef.parse('custom')).toBe('custom');
      expect(withDef.defaultValue).toBe('default-query');
    });

    it('serializes strings cleanly', () => {
      expect(parseAsString.serialize('hello')).toBe('hello');
      expect(parseAsString.serialize(null)).toBe('');
    });
  });

  describe('parseAsInteger', () => {
    it('parses valid positive and negative integers', () => {
      expect(parseAsInteger.parse('42')).toBe(42);
      expect(parseAsInteger.parse('-100')).toBe(-100);
      expect(parseAsInteger.parse('0')).toBe(0);
    });

    it('returns null on invalid integer inputs', () => {
      expect(parseAsInteger.parse(null)).toBeNull();
      expect(parseAsInteger.parse('')).toBeNull();
      expect(parseAsInteger.parse('42.5')).toBeNull();
      expect(parseAsInteger.parse('abc')).toBeNull();
      expect(parseAsInteger.parse('42px')).toBeNull();
    });

    it('supports withDefault', () => {
      const pageParser = parseAsInteger.withDefault(1);
      expect(pageParser.parse(null)).toBe(1);
      expect(pageParser.parse('invalid')).toBe(1);
      expect(pageParser.parse('5')).toBe(5);
    });

    it('serializes integers to string', () => {
      expect(parseAsInteger.serialize(42)).toBe('42');
      expect(parseAsInteger.serialize(0)).toBe('0');
      expect(parseAsInteger.serialize(null)).toBe('');
    });
  });

  describe('parseAsFloat', () => {
    it('parses floating numbers', () => {
      expect(parseAsFloat.parse('3.14')).toBe(3.14);
      expect(parseAsFloat.parse('-0.5')).toBe(-0.5);
      expect(parseAsFloat.parse('10')).toBe(10);
    });

    it('returns null on invalid float numbers', () => {
      expect(parseAsFloat.parse('abc')).toBeNull();
      expect(parseAsFloat.parse(null)).toBeNull();
    });
  });

  describe('parseAsBoolean', () => {
    it('parses truthy values ("true", "1")', () => {
      expect(parseAsBoolean.parse('true')).toBe(true);
      expect(parseAsBoolean.parse('TRUE')).toBe(true);
      expect(parseAsBoolean.parse('1')).toBe(true);
    });

    it('parses falsy values ("false", "0")', () => {
      expect(parseAsBoolean.parse('false')).toBe(false);
      expect(parseAsBoolean.parse('FALSE')).toBe(false);
      expect(parseAsBoolean.parse('0')).toBe(false);
    });

    it('returns null on unknown strings', () => {
      expect(parseAsBoolean.parse('yes')).toBeNull();
      expect(parseAsBoolean.parse(null)).toBeNull();
      expect(parseAsBoolean.parse('')).toBeNull();
    });

    it('supports withDefault', () => {
      const inStockParser = parseAsBoolean.withDefault(false);
      expect(inStockParser.parse(null)).toBe(false);
      expect(inStockParser.parse('true')).toBe(true);
      expect(inStockParser.parse('invalid')).toBe(false);
    });

    it('serializes booleans correctly', () => {
      expect(parseAsBoolean.serialize(true)).toBe('true');
      expect(parseAsBoolean.serialize(false)).toBe('false');
      expect(parseAsBoolean.serialize(null)).toBe('');
    });
  });

  describe('parseAsArray', () => {
    it('parses comma-separated values into an array', () => {
      const tagsParser = parseAsArray(parseAsString);
      expect(tagsParser.parse('electronics,gadgets,phones')).toEqual([
        'electronics',
        'gadgets',
        'phones',
      ]);
    });

    it('returns empty array on null or empty string', () => {
      const tagsParser = parseAsArray(parseAsString);
      expect(tagsParser.parse(null)).toEqual([]);
      expect(tagsParser.parse('')).toEqual([]);
      expect(tagsParser.parse('   ')).toEqual([]);
    });

    it('supports custom separators', () => {
      const pipeArray = parseAsArray(parseAsString, '|');
      expect(pipeArray.parse('a|b|c')).toEqual(['a', 'b', 'c']);
      expect(pipeArray.serialize(['a', 'b', 'c'])).toBe('a|b|c');
    });

    it('works with numeric item parsers and filters invalid elements', () => {
      const idsParser = parseAsArray(parseAsInteger);
      expect(idsParser.parse('10,20,invalid,30')).toEqual([10, 20, 30]);
      expect(idsParser.serialize([10, 20, 30])).toBe('10,20,30');
    });

    it('serializes empty array to empty string', () => {
      const tagsParser = parseAsArray(parseAsString);
      expect(tagsParser.serialize([])).toBe('');
    });
  });

  describe('parseAsNumberRange', () => {
    it('parses valid range string into min and max', () => {
      const priceParser = parseAsNumberRange(0, 1000);
      expect(priceParser.parse('100-500')).toEqual({ min: 100, max: 500 });
      expect(priceParser.defaultValue).toEqual({ min: 0, max: 1000 });
    });

    it('falls back to default bounds on invalid or missing values', () => {
      const priceParser = parseAsNumberRange(0, 1000);
      expect(priceParser.parse(null)).toEqual({ min: 0, max: 1000 });
      expect(priceParser.parse('')).toEqual({ min: 0, max: 1000 });
      expect(priceParser.parse('100')).toEqual({ min: 0, max: 1000 });
      expect(priceParser.parse('abc-def')).toEqual({ min: 0, max: 1000 });
      expect(priceParser.parse('100-200-300')).toEqual({ min: 0, max: 1000 });
    });

    it('serializes range correctly and omits when matching defaults', () => {
      const priceParser = parseAsNumberRange(0, 1000);
      expect(priceParser.serialize({ min: 50, max: 300 })).toBe('50-300');
      expect(priceParser.serialize({ min: 0, max: 1000 })).toBe('');
    });

    it('supports custom separator', () => {
      const priceParser = parseAsNumberRange(10, 50, ':');
      expect(priceParser.parse('20:40')).toEqual({ min: 20, max: 40 });
      expect(priceParser.serialize({ min: 20, max: 40 })).toBe('20:40');
    });
  });

  describe('parseAsSort', () => {
    type SortKeys = 'price' | 'rating' | 'createdAt';

    it('parses field and order', () => {
      const sortParser = parseAsSort<SortKeys>('createdAt', 'desc');
      expect(sortParser.parse('price.asc')).toEqual({ field: 'price', order: 'asc' });
      expect(sortParser.parse('rating.desc')).toEqual({ field: 'rating', order: 'desc' });
    });

    it('falls back to default order if order segment is invalid', () => {
      const sortParser = parseAsSort<SortKeys>('createdAt', 'desc');
      expect(sortParser.parse('price.unknown')).toEqual({ field: 'price', order: 'desc' });
    });

    it('falls back to default option on missing or empty string', () => {
      const sortParser = parseAsSort<SortKeys>('createdAt', 'desc');
      expect(sortParser.parse(null)).toEqual({ field: 'createdAt', order: 'desc' });
      expect(sortParser.parse('')).toEqual({ field: 'createdAt', order: 'desc' });
    });

    it('serializes sort option and omits when matching default', () => {
      const sortParser = parseAsSort<SortKeys>('createdAt', 'desc');
      expect(sortParser.serialize({ field: 'price', order: 'asc' })).toBe('price.asc');
      expect(sortParser.serialize({ field: 'createdAt', order: 'desc' })).toBe('');
    });
  });

  describe('areValuesEqual and isCleanValue', () => {
    it('compares primitives, arrays, and objects accurately', () => {
      expect(areValuesEqual('test', 'test')).toBe(true);
      expect(areValuesEqual('a', 'b')).toBe(false);
      expect(areValuesEqual([1, 2, 3], [1, 2, 3])).toBe(true);
      expect(areValuesEqual([1, 2], [1, 2, 3])).toBe(false);
      expect(areValuesEqual({ min: 10, max: 50 }, { min: 10, max: 50 })).toBe(true);
      expect(areValuesEqual({ min: 10, max: 50 }, { min: 10, max: 60 })).toBe(false);
    });

    it('determines clean values correctly for Clean URL policy', () => {
      expect(isCleanValue(null)).toBe(true);
      expect(isCleanValue(undefined)).toBe(true);
      expect(isCleanValue('')).toBe(true);
      expect(isCleanValue([])).toBe(true);
      expect(isCleanValue('active')).toBe(false);
      expect(isCleanValue(['shoes'])).toBe(false);

      expect(isCleanValue(1, 1)).toBe(true);
      expect(isCleanValue(2, 1)).toBe(false);
      expect(isCleanValue({ min: 0, max: 100 }, { min: 0, max: 100 })).toBe(true);
      expect(isCleanValue({ min: 5, max: 100 }, { min: 0, max: 100 })).toBe(false);
    });
  });

  describe('createParser custom extension', () => {
    it('allows creating custom parsers easily', () => {
      const jsonParser = createParser<{ id: number }>({
        parse: (val) => {
          if (!val) return null as unknown as { id: number };
          try {
            return JSON.parse(val);
          } catch {
            return null as unknown as { id: number };
          }
        },
        serialize: (val) => JSON.stringify(val),
        defaultValue: { id: 0 },
      });

      expect(jsonParser.parse('{"id":99}')).toEqual({ id: 99 });
      expect(jsonParser.parse(null)).toEqual({ id: 0 });
      expect(jsonParser.serialize({ id: 99 })).toBe('{"id":99}');
    });
  });
});
