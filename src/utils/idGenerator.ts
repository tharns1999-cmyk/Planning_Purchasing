/**
 * IdGenerator interface for dependency injection & deterministic testing
 */
export interface IdGenerator {
  generateId(prefix?: string): string;
}

/**
 * Clock interface for dependency injection & deterministic testing
 */
export interface Clock {
  nowISO(): string;
}

export class DefaultIdGenerator implements IdGenerator {
  private counter = 0;

  generateId(prefix: string = 'id'): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `${prefix}-${crypto.randomUUID()}`;
    }
    this.counter += 1;
    return `${prefix}-${Date.now()}-${this.counter}`;
  }
}

export class DefaultClock implements Clock {
  nowISO(): string {
    return new Date().toISOString();
  }
}

/**
 * Deterministic IdGenerator for testing
 */
export class TestIdGenerator implements IdGenerator {
  private counter = 0;

  constructor(private readonly fixedPrefix: string = 'test') {}

  generateId(prefix?: string): string {
    this.counter += 1;
    const p = prefix || this.fixedPrefix;
    return `${p}-${String(this.counter).padStart(4, '0')}`;
  }
}

/**
 * Deterministic Clock for testing
 */
export class TestClock implements Clock {
  constructor(private readonly fixedTime: string = '2026-07-20T00:00:00.000Z') {}

  nowISO(): string {
    return this.fixedTime;
  }
}
