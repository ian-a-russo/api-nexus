const DEFAULT_ORIGIN = 'http://localhost:5173';

export function allowedOrigin(): string {
  return process.env.CORS_ORIGIN ?? DEFAULT_ORIGIN;
}

export function corsOptions() {
  return { origin: allowedOrigin(), credentials: true };
}

export function socketCorsOptions() {
  return {
    origin: (
      requestOrigin: string | undefined,
      callback: (error: Error | null, allowed?: boolean) => void,
    ) => callback(null, !requestOrigin || requestOrigin === allowedOrigin()),
    credentials: true,
  };
}
