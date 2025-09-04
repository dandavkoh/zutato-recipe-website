import * as Sentry from '@sentry/nextjs';

type ExtraContext = Record<string, unknown> | undefined;

export function reportError(error: unknown, context?: ExtraContext): string | undefined {
  try {
    const eventId = Sentry.captureException(error, context ? { extra: context } : undefined);
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.error('[Error captured]', error, context);
    }
    return eventId;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[Error capture failed]', e);
    return undefined;
  }
}

export function reportMessage(message: string, context?: ExtraContext): string | undefined {
  try {
    const eventId = Sentry.captureMessage(message, context ? { level: 'error', extra: context } as any : { level: 'error' } as any);
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.error('[Message captured]', message, context);
    }
    return eventId;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[Message capture failed]', e);
    return undefined;
  }
}


