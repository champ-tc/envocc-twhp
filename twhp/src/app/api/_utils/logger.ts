// src/app/api/_utils/logger.ts

/**
 * Simple logger utility for API routes.
 * In development it uses console.error; in production you can replace with a proper logger.
 */
export const logger = {
  error: (message: string, error?: unknown) => {
    if (process.env.NODE_ENV !== "production") {
      console.error(message, error);
    } else {
      // TODO: integrate with production logging system (e.g., pino, winston)
      console.error(message, error);
    }
  },
};
