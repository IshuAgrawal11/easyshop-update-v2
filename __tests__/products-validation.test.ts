import { SORTABLE_FIELDS, productInputSchema, escapeRegex } from '@/lib/validation/products';

describe('escapeRegex', () => {
  it('leaves plain text unchanged', () => {
    expect(escapeRegex('bread')).toBe('bread');
  });

  it('escapes regex metacharacters so they are matched literally', () => {
    expect(escapeRegex('a.b*c?')).toBe('a\\.b\\*c\\?');
  });

  it('produces a regex that does not throw on attacker-controlled input', () => {
    const malicious = '(((((((((';
    expect(() => new RegExp(escapeRegex(malicious), 'i')).not.toThrow();
  });

  it('escaped output matches the literal string, not as a pattern', () => {
    const input = 'a+b';
    const regex = new RegExp(escapeRegex(input), 'i');
    expect(regex.test('a+b')).toBe(true);
    expect(regex.test('aaab')).toBe(false);
  });
});

describe('SORTABLE_FIELDS allowlist', () => {
  it('allows known-safe sort fields', () => {
    expect(SORTABLE_FIELDS.has('price')).toBe(true);
    expect(SORTABLE_FIELDS.has('createdAt')).toBe(true);
  });

  it('rejects arbitrary/malicious field names', () => {
    expect(SORTABLE_FIELDS.has('__proto__')).toBe(false);
    expect(SORTABLE_FIELDS.has('constructor')).toBe(false);
    expect(SORTABLE_FIELDS.has('password')).toBe(false);
  });
});

describe('productInputSchema', () => {
  const validProduct = {
    originalId: 'p-1',
    title: 'Test Product',
    description: 'A product for testing',
    price: 9.99,
    amount: 10,
    shop_category: 'grocery',
  };

  it('accepts a valid minimal product payload', () => {
    const result = productInputSchema.safeParse(validProduct);
    expect(result.success).toBe(true);
  });

  it('rejects a payload missing required fields', () => {
    const { price, ...withoutPrice } = validProduct;
    const result = productInputSchema.safeParse(withoutPrice);
    expect(result.success).toBe(false);
  });

  it('rejects a payload with wrong field types', () => {
    const result = productInputSchema.safeParse({ ...validProduct, price: 'not-a-number' });
    expect(result.success).toBe(false);
  });

  it('strips unexpected fields rather than passing them through unchanged (mass-assignment guard)', () => {
    const result = productInputSchema.safeParse({ ...validProduct, role: 'admin', isAdmin: true });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty('role');
      expect(result.data).not.toHaveProperty('isAdmin');
    }
  });
});
