const RESEND_EMAILS_URL = 'https://api.resend.com/emails';
const REQUEST_TIMEOUT_MS = 10000;

export function createResendMailer({ apiKey, from }) {
  return {
    async send({ to, subject, text }) {
      const response = await fetch(RESEND_EMAILS_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify({ from, to, subject, text }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
      });

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        let message = `Resend request failed with status ${response.status}`;
        if (body && typeof body.message === 'string' && body.message) {
          message += `: ${body.message}`;
        }
        if (apiKey) {
          message = message.replaceAll(apiKey, '[redacted]');
        }
        throw new Error(message);
      }

      return body?.id;
    }
  };
}
