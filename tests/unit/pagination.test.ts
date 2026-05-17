import { describe, it, expect } from 'vitest';
import { parsePagination, paginatedResponse } from '../../src/shared/utils/pagination.js';

describe('parsePagination', () => {
  it('defaults page and limit', () => {
    expect(parsePagination({})).toEqual({ page: 1, limit: 20, skip: 0 });
  });

  it('clamps negative page to 1', () => {
    expect(parsePagination({ page: -3, limit: 10 }).page).toBe(1);
  });

  it('caps limit at 100', () => {
    expect(parsePagination({ limit: 500 }).limit).toBe(100);
  });

  it('floors limit below 1 to 1', () => {
    expect(parsePagination({ limit: 0 }).limit).toBe(1);
  });
});

describe('paginatedResponse', () => {
  it('includes totalCount and totalPages in meta', () => {
    const result = paginatedResponse(['a'], 5, 1, 2);
    expect(result.meta.totalCount).toBe(5);
    expect(result.meta.totalPages).toBe(3);
  });
});
