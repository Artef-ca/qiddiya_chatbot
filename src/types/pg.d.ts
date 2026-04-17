declare module 'pg' {
  export interface PoolConfig {
    host?: string;
    user?: string;
    password?: string;
    database?: string;
    max?: number;
    idleTimeoutMillis?: number;
    connectionTimeoutMillis?: number;
  }

  export class Pool {
    constructor(config?: PoolConfig);
    on(event: string, callback: (err: Error) => void): void;
    end(): Promise<void>;
    query(text: string, values?: unknown[]): Promise<{ rows: unknown[] }>;
  }
}
