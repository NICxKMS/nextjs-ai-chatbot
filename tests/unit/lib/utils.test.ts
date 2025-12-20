import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cn } from '@/lib/utils/cn';
import { generateUUID, convertToUIMessages } from '@/lib/utils';

describe('cn (class name utility)', () => {
  it('should combine multiple class names', () => {
    const result = cn('class1', 'class2', 'class3');
    expect(result).toBe('class1 class2 class3');
  });

  it('should handle conditional classes with objects', () => {
    const result = cn('base', { active: true, disabled: false });
    expect(result).toBe('base active');
  });

  it('should handle arrays of class names', () => {
    const result = cn(['class1', 'class2'], 'class3');
    expect(result).toBe('class1 class2 class3');
  });

  it('should filter out falsy values', () => {
    const result = cn('class1', null, undefined, false, '', 'class2');
    expect(result).toBe('class1 class2');
  });

  it('should merge conflicting Tailwind classes (last wins)', () => {
    const result = cn('px-4', 'px-8');
    expect(result).toBe('px-8');
  });

  it('should merge conflicting padding classes', () => {
    const result = cn('p-2', 'p-4');
    expect(result).toBe('p-4');
  });

  it('should merge conflicting margin classes', () => {
    const result = cn('m-2', 'm-4');
    expect(result).toBe('m-4');
  });

  it('should handle complex Tailwind class combinations', () => {
    const result = cn(
      'px-4 py-2',
      'bg-blue-500',
      { 'opacity-50': true },
      'hover:bg-blue-600'
    );
    expect(result).toBe('px-4 py-2 bg-blue-500 opacity-50 hover:bg-blue-600');
  });

  it('should handle responsive prefix conflicts', () => {
    const result = cn('md:px-4', 'md:px-8');
    expect(result).toBe('md:px-8');
  });

  it('should keep different responsive prefixes', () => {
    const result = cn('sm:px-2', 'md:px-4', 'lg:px-8');
    expect(result).toBe('sm:px-2 md:px-4 lg:px-8');
  });

  it('should handle empty input', () => {
    const result = cn();
    expect(result).toBe('');
  });

  it('should handle single class', () => {
    const result = cn('single-class');
    expect(result).toBe('single-class');
  });

  it('should handle deeply nested arrays', () => {
    const result = cn(['class1', ['class2', ['class3']]]);
    expect(result).toBe('class1 class2 class3');
  });

  it('should handle mixed conditional and static classes', () => {
    const isActive = true;
    const isDisabled = false;
    const result = cn(
      'base-class',
      isActive && 'active-class',
      isDisabled && 'disabled-class',
      { highlighted: true }
    );
    expect(result).toBe('base-class active-class highlighted');
  });
});

describe('generateUUID', () => {
  let originalRandomUUID: typeof crypto.randomUUID;

  beforeEach(() => {
    originalRandomUUID = crypto.randomUUID;
  });

  afterEach(() => {
    crypto.randomUUID = originalRandomUUID;
  });

  it('should generate a valid UUID v4 format', () => {
    const uuid = generateUUID();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(uuid).toMatch(uuidRegex);
  });

  it('should generate unique UUIDs', () => {
    const uuid1 = generateUUID();
    const uuid2 = generateUUID();
    const uuid3 = generateUUID();

    expect(uuid1).not.toBe(uuid2);
    expect(uuid2).not.toBe(uuid3);
    expect(uuid1).not.toBe(uuid3);
  });

  it('should call crypto.randomUUID', () => {
    const mockUUID = '12345678-1234-4234-8234-123456789012';
    crypto.randomUUID = vi.fn().mockReturnValue(mockUUID);

    const result = generateUUID();

    expect(crypto.randomUUID).toHaveBeenCalled();
    expect(result).toBe(mockUUID);
  });
});

describe('convertToUIMessages', () => {
  it('should convert database messages to UI format', () => {
    const dbMessages = [
      {
        id: 'msg-1',
        role: 'user' as const,
        parts: [{ type: 'text', text: 'Hello' }],
        createdAt: new Date('2024-01-01T00:00:00Z'),
      },
      {
        id: 'msg-2',
        role: 'assistant' as const,
        parts: [{ type: 'text', text: 'Hi there!' }],
        createdAt: new Date('2024-01-01T00:00:01Z'),
      },
    ];

    const result = convertToUIMessages(dbMessages);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: 'msg-1',
      role: 'user',
      parts: [{ type: 'text', text: 'Hello' }],
      createdAt: dbMessages[0].createdAt,
    });
    expect(result[1]).toEqual({
      id: 'msg-2',
      role: 'assistant',
      parts: [{ type: 'text', text: 'Hi there!' }],
      createdAt: dbMessages[1].createdAt,
    });
  });

  it('should handle empty array', () => {
    const result = convertToUIMessages([]);
    expect(result).toEqual([]);
  });

  it('should handle null parts by converting to empty array', () => {
    const dbMessages = [
      {
        id: 'msg-1',
        role: 'user' as const,
        parts: null as unknown,
        createdAt: new Date('2024-01-01T00:00:00Z'),
      },
    ];

    const result = convertToUIMessages(dbMessages);

    expect(result[0].parts).toEqual([]);
  });

  it('should handle undefined parts by converting to empty array', () => {
    const dbMessages = [
      {
        id: 'msg-1',
        role: 'system' as const,
        parts: undefined as unknown,
        createdAt: new Date('2024-01-01T00:00:00Z'),
      },
    ];

    const result = convertToUIMessages(dbMessages);

    expect(result[0].parts).toEqual([]);
  });

  it('should preserve all message roles', () => {
    const dbMessages = [
      {
        id: 'msg-1',
        role: 'user' as const,
        parts: [],
        createdAt: new Date(),
      },
      {
        id: 'msg-2',
        role: 'assistant' as const,
        parts: [],
        createdAt: new Date(),
      },
      {
        id: 'msg-3',
        role: 'system' as const,
        parts: [],
        createdAt: new Date(),
      },
    ];

    const result = convertToUIMessages(dbMessages);

    expect(result[0].role).toBe('user');
    expect(result[1].role).toBe('assistant');
    expect(result[2].role).toBe('system');
  });

  it('should preserve Date objects', () => {
    const testDate = new Date('2024-06-15T12:30:00Z');
    const dbMessages = [
      {
        id: 'msg-1',
        role: 'user' as const,
        parts: [],
        createdAt: testDate,
      },
    ];

    const result = convertToUIMessages(dbMessages);

    expect(result[0].createdAt).toBe(testDate);
    expect(result[0].createdAt instanceof Date).toBe(true);
  });

  it('should handle complex parts arrays', () => {
    const complexParts = [
      { type: 'text', text: 'Check this image:' },
      { type: 'image', url: 'https://example.com/img.png' },
      { type: 'tool-call', toolName: 'search', args: { query: 'test' } },
    ];

    const dbMessages = [
      {
        id: 'msg-1',
        role: 'assistant' as const,
        parts: complexParts,
        createdAt: new Date(),
      },
    ];

    const result = convertToUIMessages(dbMessages);

    expect(result[0].parts).toEqual(complexParts);
  });
});
