const crypto  = require('crypto');
const Webhook = require('../models/Webhook');

/**
 * Fire all active webhooks for a flag event — fully non-blocking.
 * Failures are logged but never throw.
 *
 * @param {string} event  - FLAG_CREATED | FLAG_UPDATED | FLAG_DELETED | FLAG_TOGGLED
 * @param {object} flag   - FeatureFlag document (or plain object)
 */
async function dispatch(event, flag) {
  if (!flag?.projectId) return;

  try {
    const hooks = await Webhook.find({
      projectId: flag.projectId,
      isActive:  true,
      events:    event,
    }).lean();

    if (!hooks.length) return;

    const body      = JSON.stringify({ event, flag, timestamp: new Date().toISOString() });
    const deliveries = hooks.map(hook => deliver(hook, event, body));

    // All deliveries run in parallel; we await to update lastStatus but don't block callers
    Promise.allSettled(deliveries).catch(() => {});
  } catch (err) {
    console.error('[webhook] dispatch error:', err.message);
  }
}

async function deliver(hook, event, body) {
  const sig = crypto.createHmac('sha256', hook.secret).update(body).digest('hex');

  let status = 0;
  try {
    const res = await fetch(hook.url, {
      method:  'POST',
      headers: {
        'Content-Type':          'application/json',
        'X-SwitchOn-Event':      event,
        'X-SwitchOn-Signature':  `sha256=${sig}`,
        'X-SwitchOn-Delivery':   crypto.randomUUID(),
      },
      body,
      signal: AbortSignal.timeout(5000),
    });
    status = res.status;
  } catch (err) {
    console.error(`[webhook] delivery failed → ${hook.url}:`, err.message);
  }

  // Update delivery metadata non-blocking
  Webhook.updateOne(
    { _id: hook._id },
    { lastCalledAt: new Date(), lastStatus: status },
  ).catch(() => {});
}

module.exports = { dispatch };
