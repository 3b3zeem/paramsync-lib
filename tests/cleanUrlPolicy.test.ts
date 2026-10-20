import { describe, it, expect } from 'vitest';
import {
  isCleanValue,
  parseAsString,
  parseAsArray,
  parseAsNumberRange,
  parseAsSort,
} from '../src/parsers';

describe('Clean URL Policy Edge Cases', () => {
  it('identifies null and undefined as clean values', () => {
    expect(isCleanValue(null)).toBe(true);
    expect(isCleanValue(undefined)).toBe(true);
  });

  it('identifies empty string as clean value', () => {
    expect(isCleanValue('')).toBe(true);
    expect(isCleanValue('   ')).toBe(false);
  });

  it('identifies empty arrays as clean values', () => {
    expect(isCleanValue([])).toBe(true);
    expect(isCleanValue(['item'])).toBe(false);
  });

  it('distinguishes between 0 and falsy clean values', () => {
    expect(isCleanValue(0)).toBe(false);
    expect(isCleanValue(0, 0)).toBe(true);
    expect(isCleanValue(0, 1)).toBe(false);
  });

  it('distinguishes between false and clean values', () => {
    expect(isCleanValue(false)).toBe(false);
    expect(isCleanValue(false, false)).toBe(true);
    expect(isCleanValue(false, true)).toBe(false);
  });

  it('cleans number ranges matching their defaults', () => {
    const rangeParser = parseAsNumberRange(0, 100);
    const defaultRange = { min: 0, max: 100 };
    const customRange = { min: 20, max: 80 };

    expect(isCleanValue(defaultRange, rangeParser.defaultValue)).toBe(true);
    expect(isCleanValue(customRange, rangeParser.defaultValue)).toBe(false);
  });

  it('cleans sort options matching their defaults', () => {
    const sortParser = parseAsSort('createdAt', 'desc');
    const defaultSort = { field: 'createdAt', order: 'desc' as const };
    const customSort = { field: 'price', order: 'asc' as const };

    expect(isCleanValue(defaultSort, sortParser.defaultValue)).toBe(true);
    expect(isCleanValue(customSort, sortParser.defaultValue)).toBe(false);
  });

  it('cleans string matching default value', () => {
    const searchParser = parseAsString.withDefault('all');
    expect(isCleanValue('all', searchParser.defaultValue)).toBe(true);
    expect(isCleanValue('specific', searchParser.defaultValue)).toBe(false);
  });

  it('cleans array matching default value', () => {
    const arrayParser = parseAsArray(parseAsString).withDefault(['featured']);
    expect(isCleanValue(['featured'], arrayParser.defaultValue)).toBe(true);
    expect(isCleanValue(['other'], arrayParser.defaultValue)).toBe(false);
  });
});
