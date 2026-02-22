/**
 * Lemon Squeezy Configuration
 * Merchant of Record for handling payments, tax, and chargebacks
 */

const { LemonSqueezy } = require('@lemonsqueezy/lemonsqueezy.js');

// Initialize client
const client = new LemonSqueezy(process.env.LEMONSQUEEZY_API_KEY);

// Store ID from Lemon Squeezy dashboard
const STORE_ID = process.env.LEMONSQUEEZY_STORE_ID;

// Product variants for subscription tiers
const PRODUCTS = {
  basic: {
    name: 'Basic Plan',
    productId: process.env.LEMONSQUEEZY_BASIC_PRODUCT_ID,
    variantId: process.env.LEMONSQUEEZY_BASIC_VARIANT_ID,
    price: 2900, // $29.00 in cents
    interval: 'month'
  },
  professional: {
    name: 'Professional Plan',
    productId: process.env.LEMONSQUEEZY_PRO_PRODUCT_ID,
    variantId: process.env.LEMONSQUEEZY_PRO_VARIANT_ID,
    price: 7900, // $79.00 in cents
    interval: 'month'
  },
  firm: {
    name: 'Firm Plan',
    productId: process.env.LEMONSQUEEZY_FIRM_PRODUCT_ID,
    variantId: process.env.LEMONSQUEEZY_FIRM_VARIANT_ID,
    price: 29900, // $299.00 in cents
    interval: 'month'
  }
};

// Packet products (one-time purchases)
const PACKET_PRODUCTS = {
  'traffic-ticket': {
    name: 'Traffic Ticket Defense Packet',
    variantId: process.env.LEMONSQUEEZY_TRAFFIC_PACKET_ID,
    basePrice: 999 // $9.99
  },
  'eviction-defense': {
    name: 'Eviction Defense Packet',
    variantId: process.env.LEMONSQUEEZY_EVICTION_PACKET_ID,
    basePrice: 1499 // $14.99
  },
  'expungement': {
    name: 'Expungement Packet',
    variantId: process.env.LEMONSQUEEZY_EXPUNGEMENT_PACKET_ID,
    basePrice: 1999 // $19.99
  },
  'dl-reinstatement': {
    name: 'DL Reinstatement Packet',
    variantId: process.env.LEMONSQUEEZY_DL_PACKET_ID,
    basePrice: 999 // $9.99
  },
  'foreclosure': {
    name: 'Foreclosure Prevention Packet',
    variantId: process.env.LEMONSQUEEZY_FORECLOSURE_PACKET_ID,
    basePrice: 1499 // $14.99
  }
};

/**
 * Create a checkout for subscription
 * @param {string} tierId - Subscription tier (basic, professional, firm)
 * @param {object} user - User information
 * @returns {Promise<object>} - Checkout URL and ID
 */
async function createSubscriptionCheckout(tierId, user) {
  const product = PRODUCTS[tierId];

  if (!product) {
    throw new Error(`Invalid tier: ${tierId}`);
  }

  try {
    const checkout = await client.createCheckout({
      storeId: parseInt(STORE_ID),
      variantId: parseInt(product.variantId),
      checkoutData: {
        email: user.email,
        name: user.name,
        custom: {
          user_id: user.id,
          tier: tierId
        }
      },
      checkoutOptions: {
        embed: false,
        media: true,
        logo: true,
        desc: true,
        discount: true,
        dark: false,
        subscriptionPreview: true,
        buttonText: 'Subscribe'
      },
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    });

    return {
      checkoutId: checkout.data.id,
      checkoutUrl: checkout.data.attributes.url,
      customerId: checkout.data.relationships.customer?.data?.id
    };
  } catch (error) {
    console.error('Lemon Squeezy checkout error:', error);
    throw new Error('Failed to create checkout');
  }
}

/**
 * Create a checkout for single packet purchase
 * @param {string} packetType - Packet type
 * @param {object} user - User information
 * @param {number} discountPercent - Discount percentage from subscription
 * @returns {Promise<object>} - Checkout URL and ID
 */
async function createPacketCheckout(packetType, user, discountPercent = 0) {
  const product = PACKET_PRODUCTS[packetType];

  if (!product) {
    throw new Error(`Invalid packet type: ${packetType}`);
  }

  const finalPrice = Math.round(product.basePrice * (1 - discountPercent / 100));

  try {
    const checkout = await client.createCheckout({
      storeId: parseInt(STORE_ID),
      variantId: parseInt(product.variantId),
      checkoutData: {
        email: user.email,
        name: user.name,
        custom: {
          user_id: user.id,
          packet_type: packetType,
          discount_applied: discountPercent
        }
      },
      checkoutOptions: {
        embed: false,
        buttonText: 'Purchase Packet'
      }
    });

    return {
      checkoutId: checkout.data.id,
      checkoutUrl: checkout.data.attributes.url,
      price: finalPrice / 100 // Convert to dollars
    };
  } catch (error) {
    console.error('Lemon Squeezy packet checkout error:', error);
    throw new Error('Failed to create packet checkout');
  }
}

/**
 * Get subscription status
 * @param {string} subscriptionId - Lemon Squeezy subscription ID
 * @returns {Promise<object>} - Subscription details
 */
async function getSubscription(subscriptionId) {
  try {
    const subscription = await client.getSubscription(subscriptionId);

    return {
      id: subscription.data.id,
      status: subscription.data.attributes.status,
      productName: subscription.data.attributes.product_name,
      variantName: subscription.data.attributes.variant_name,
      currentPeriodStart: subscription.data.attributes.current_period_start,
      currentPeriodEnd: subscription.data.attributes.current_period_end,
      cancelled: subscription.data.attributes.cancelled,
      cancelAtPeriodEnd: subscription.data.attributes.cancel_at_period_end,
      customerId: subscription.data.relationships.customer?.data?.id
    };
  } catch (error) {
    console.error('Get subscription error:', error);
    throw new Error('Failed to get subscription');
  }
}

/**
 * Cancel subscription
 * @param {string} subscriptionId - Lemon Squeezy subscription ID
 * @returns {Promise<object>} - Cancellation result
 */
async function cancelSubscription(subscriptionId) {
  try {
    const subscription = await client.cancelSubscription(subscriptionId);

    return {
      success: true,
      subscriptionId: subscription.data.id,
      status: subscription.data.attributes.status,
      cancelAtPeriodEnd: subscription.data.attributes.cancel_at_period_end
    };
  } catch (error) {
    console.error('Cancel subscription error:', error);
    throw new Error('Failed to cancel subscription');
  }
}

/**
 * Update subscription payment method
 * @param {string} subscriptionId - Lemon Squeezy subscription ID
 * @param {string} customerId - Lemon Squeezy customer ID
 * @returns {Promise<object>} - Update URL for customer
 */
async function updatePaymentMethod(subscriptionId, customerId) {
  try {
    // Generate customer portal URL for payment method update
    const portal = await client.createCustomerPortal({
      customerId: customerId
    });

    return {
      portalUrl: portal.data.attributes.url
    };
  } catch (error) {
    console.error('Update payment method error:', error);
    throw new Error('Failed to generate update URL');
  }
}

/**
 * Get customer orders
 * @param {string} customerId - Lemon Squeezy customer ID
 * @returns {Promise<array>} - List of orders
 */
async function getCustomerOrders(customerId) {
  try {
    const orders = await client.getOrders({
      filter: { customerId: customerId }
    });

    return orders.data.map(order => ({
      orderId: order.id,
      orderNumber: order.attributes.order_number,
      status: order.attributes.status,
      total: order.attributes.total,
      currency: order.attributes.currency,
      createdAt: order.attributes.created_at,
      productName: order.attributes.first_order_item?.product_name
    }));
  } catch (error) {
    console.error('Get orders error:', error);
    throw new Error('Failed to get orders');
  }
}

/**
 * Validate webhook signature
 * @param {string} payload - Raw request body
 * @param {string} signature - X-Signature header
 * @returns {boolean} - Is valid webhook
 */
function validateWebhook(payload, signature) {
  const crypto = require('crypto');
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;

  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const expectedSignature = hmac.digest('hex');

  return signature === expectedSignature;
}

module.exports = {
  client,
  PRODUCTS,
  PACKET_PRODUCTS,
  createSubscriptionCheckout,
  createPacketCheckout,
  getSubscription,
  cancelSubscription,
  updatePaymentMethod,
  getCustomerOrders,
  validateWebhook
};
