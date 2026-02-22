/**
 * API: Lemon Squeezy Webhook Handler
 * Handles payment events, subscription changes, and order completion
 */

const { validateWebhook } = require('../../lib/lemonsqueezy-config');
const { getTier } = require('../subscription/subscription-tiers');

module.exports = async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate webhook signature
    const signature = req.headers['x-signature'];
    const payload = JSON.stringify(req.body);

    if (!validateWebhook(payload, signature)) {
      console.error('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = req.body;
    const eventName = event.meta?.event_name;

    console.log(`Webhook received: ${eventName}`);

    // Handle different event types
    switch (eventName) {
      case 'order_created':
        await handleOrderCreated(event);
        break;

      case 'order_updated':
        await handleOrderUpdated(event);
        break;

      case 'subscription_created':
        await handleSubscriptionCreated(event);
        break;

      case 'subscription_updated':
        await handleSubscriptionUpdated(event);
        break;

      case 'subscription_cancelled':
        await handleSubscriptionCancelled(event);
        break;

      case 'subscription_expired':
        await handleSubscriptionExpired(event);
        break;

      case 'subscription_payment_success':
        await handleSubscriptionPaymentSuccess(event);
        break;

      case 'subscription_payment_failed':
        await handleSubscriptionPaymentFailed(event);
        break;

      case 'license_key_created':
        await handleLicenseKeyCreated(event);
        break;

      default:
        console.log(`Unhandled event: ${eventName}`);
    }

    // Always return 200 to acknowledge receipt
    return res.status(200).json({ received: true, event: eventName });

  } catch (error) {
    console.error('Webhook error:', error);
    // Still return 200 to prevent retries for known errors
    return res.status(200).json({
      received: true,
      error: error.message
    });
  }
}

/**
 * Handle order created event
 */
async function handleOrderCreated(event) {
  const order = event.data;
  const attributes = order.attributes;

  console.log(`Order created: ${attributes.order_number}`);

  // Extract custom data
  const customData = attributes.custom_data || {};
  const userId = customData.user_id;
  const packetType = customData.packet_type;

  // If this is a packet purchase, update user's packet count
  if (packetType) {
    console.log(`Packet purchased: ${packetType} by user ${userId}`);
    // TODO: Update database with packet purchase
    // await updateUserPacketCount(userId, packetType);
  }

  // Send confirmation email
  // TODO: Send email to attributes.user_email
}

/**
 * Handle order updated event
 */
async function handleOrderUpdated(event) {
  const order = event.data;
  const attributes = order.attributes;

  console.log(`Order updated: ${attributes.order_number} - Status: ${attributes.status}`);

  // Handle refund
  if (attributes.status === 'refunded') {
    console.log(`Order refunded: ${attributes.order_number}`);
    // TODO: Handle refund logic
  }
}

/**
 * Handle subscription created event
 */
async function handleSubscriptionCreated(event) {
  const subscription = event.data;
  const attributes = subscription.attributes;

  console.log(`Subscription created: ${attributes.product_name} - ${attributes.variant_name}`);

  // Extract tier from variant name or custom data
  const customData = attributes.custom_data || {};
  const tierId = customData.tier || mapVariantToTier(attributes.variant_name);

  // Update user's subscription in database
  const userId = customData.user_id;
  console.log(`User ${userId} subscribed to ${tierId}`);

  // TODO: Update database
  // await updateUserSubscription(userId, {
  //   subscriptionId: subscription.id,
  //   tier: tierId,
  //   status: attributes.status,
  //   currentPeriodEnd: attributes.current_period_end
  // });
}

/**
 * Handle subscription updated event
 */
async function handleSubscriptionUpdated(event) {
  const subscription = event.data;
  const attributes = subscription.attributes;

  console.log(`Subscription updated: ${subscription.id} - Status: ${attributes.status}`);

  // Handle tier changes
  const oldVariant = event.meta?.custom_data?.old_variant;
  const newVariant = attributes.variant_name;

  if (oldVariant !== newVariant) {
    console.log(`Tier changed: ${oldVariant} -> ${newVariant}`);
    // TODO: Update user's tier in database
  }
}

/**
 * Handle subscription cancelled event
 */
async function handleSubscriptionCancelled(event) {
  const subscription = event.data;
  const attributes = subscription.attributes;

  console.log(`Subscription cancelled: ${subscription.id}`);

  // Update user's subscription status
  // TODO: Update database
  // await updateUserSubscription(userId, {
  //   subscriptionId: subscription.id,
  //   status: 'cancelled',
  //   cancelledAt: new Date().toISOString()
  // });
}

/**
 * Handle subscription expired event
 */
async function handleSubscriptionExpired(event) {
  const subscription = event.data;
  const attributes = subscription.attributes;

  console.log(`Subscription expired: ${subscription.id}`);

  // Downgrade user to free tier
  // TODO: Update database
  // await updateUserSubscription(userId, {
  //   subscriptionId: null,
  //   tier: 'free',
  //   status: 'expired'
  // });
}

/**
 * Handle successful subscription payment
 */
async function handleSubscriptionPaymentSuccess(event) {
  const subscription = event.data;
  const attributes = subscription.attributes;

  console.log(`Payment success: ${subscription.id}`);

  // Extend user's subscription period
  // TODO: Update database
  // await updateUserSubscription(userId, {
  //   currentPeriodEnd: attributes.current_period_end,
  //   status: 'active'
  // });
}

/**
 * Handle failed subscription payment
 */
async function handleSubscriptionPaymentFailed(event) {
  const subscription = event.data;
  const attributes = subscription.attributes;

  console.log(`Payment failed: ${subscription.id}`);

  // Notify user of failed payment
  // TODO: Send email notification
  // TODO: Update subscription status
}

/**
 * Handle license key created (for packet access)
 */
async function handleLicenseKeyCreated(event) {
  const licenseKey = event.data;
  const attributes = licenseKey.attributes;

  console.log(`License key created: ${attributes.key}`);

  // Associate license key with user
  // TODO: Store license key in database
}

/**
 * Map variant name to tier ID
 */
function mapVariantToTier(variantName) {
  const variant = variantName.toLowerCase();
  if (variant.includes('firm')) return 'firm';
  if (variant.includes('professional') || variant.includes('pro')) return 'professional';
  if (variant.includes('basic')) return 'basic';
  return 'basic';
}
