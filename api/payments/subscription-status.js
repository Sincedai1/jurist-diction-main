/**
 * API: Get Subscription Status
 * Returns current subscription details for a user
 */

const { getSubscription, getCustomerOrders } = require('../../lib/lemonsqueezy-config');
const { getTier } = require('../subscription/subscription-tiers');

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get subscription ID from query or body
    const subscriptionId = req.query.subscriptionId || req.body?.subscriptionId;
    const customerId = req.query.customerId || req.body?.customerId;

    if (!subscriptionId && !customerId) {
      return res.status(400).json({
        error: 'Missing subscription or customer ID'
      });
    }

    let subscription = null;
    let orders = null;

    // Get subscription details
    if (subscriptionId) {
      subscription = await getSubscription(subscriptionId);
    }

    // Get customer orders
    if (customerId) {
      orders = await getCustomerOrders(customerId);
    }

    // Map subscription to tier
    let tier = null;
    if (subscription) {
      const variantName = subscription.variantName?.toLowerCase() || '';
      if (variantName.includes('firm')) tier = getTier('firm');
      else if (variantName.includes('professional') || variantName.includes('pro')) tier = getTier('professional');
      else if (variantName.includes('basic')) tier = getTier('basic');
    }

    return res.json({
      success: true,
      subscription: subscription ? {
        id: subscription.id,
        status: subscription.status,
        productName: subscription.productName,
        variantName: subscription.variantName,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelled: subscription.cancelled,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd
      } : null,
      tier: tier ? {
        id: tier.id,
        name: tier.name,
        price: tier.price,
        features: tier.features
      } : null,
      orders: orders || []
    });

  } catch (error) {
    console.error('Get subscription status error:', error);
    return res.status(500).json({
      error: 'Failed to get subscription status',
      message: error.message
    });
  }
};
