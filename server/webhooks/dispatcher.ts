import crypto from 'crypto';
import { db } from '../../lib/database/index.ts';
import { Webhook, WebhookLog } from '../../lib/database/types.ts';

export class WebhookDispatcher {
  /**
   * Dispatches an event payload to all active webhooks subscribed to this event.
   */
  public async dispatch(event: string, payload: any): Promise<void> {
    const webhooks = db.getWebhooks().filter((w) => w.active);
    const matched = webhooks.filter((w) => w.events.includes('*') || w.events.includes(event));

    if (matched.length === 0) return;

    for (const hook of matched) {
      this.sendToWebhook(hook, event, payload).catch((err) => {
        console.error(`Webhook delivery error for ${hook.url}:`, err);
      });
    }
  }

  /**
   * Delivers payload with HMAC-SHA256 signature in headers.
   */
  public async sendToWebhook(webhook: Webhook, event: string, payload: any): Promise<WebhookLog> {
    const startTime = Date.now();
    const bodyStr = JSON.stringify({
      event,
      timestamp: new Date().toISOString(),
      data: payload,
    });

    const signature = crypto
      .createHmac('sha256', webhook.secret || 'default-reachmarket-secret')
      .update(bodyStr)
      .digest('hex');

    let responseStatus = 0;
    let responseBody = '';
    let success = false;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'ReachMarket-Webhook-Bot/1.0',
          'X-ReachMarket-Event': event,
          'X-ReachMarket-Signature': `sha256=${signature}`,
        },
        body: bodyStr,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      responseStatus = res.status;
      responseBody = (await res.text()).substring(0, 500);
      success = res.ok;
    } catch (err: any) {
      responseStatus = 500;
      responseBody = err.message || 'Network timeout or unreachable host';
      success = false;
    }

    const durationMs = Date.now() - startTime;
    const log: WebhookLog = {
      id: `whl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      webhookId: webhook.id,
      webhookName: webhook.name,
      event,
      url: webhook.url,
      payload,
      responseStatus,
      responseBody,
      durationMs,
      success,
      timestamp: new Date().toISOString(),
    };

    db.addWebhookLog(log);
    return log;
  }
}

export const webhookDispatcher = new WebhookDispatcher();
