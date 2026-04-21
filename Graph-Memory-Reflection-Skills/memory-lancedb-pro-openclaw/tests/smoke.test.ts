import { describe, it, expect } from 'vitest';

describe('Smoke Tests', () => {
  it('should have tests working', () => {
    expect(true).toBe(true);
  });

  it('should support basic math', () => {
    expect(1 + 1).toBe(2);
  });

  it('should support string operations', () => {
    expect('hello'.toUpperCase()).toBe('HELLO');
  });
});
