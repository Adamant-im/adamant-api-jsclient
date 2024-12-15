export class AdamantWsError extends Error {
  reason: string;
  details: string;

  constructor(reason: string, details: string | Error) {
    const message = String(details);

    super(message);

    this.name = 'AdamantWsError';

    this.reason = reason;
    this.details = message;
  }
}
