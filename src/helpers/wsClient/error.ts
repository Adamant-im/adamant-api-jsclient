export class AdamantWsConnectionError extends Error {
  reason: string;
  details: string;

  constructor(reason: string, details: string | Error) {
    const message = String(details);

    super(message);

    this.name = 'AdamantWsConnectionError';

    this.reason = reason;
    this.details = message;
  }
}
