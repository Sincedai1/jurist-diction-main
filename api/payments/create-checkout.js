/**
 * API: Create Checkout Session
 * Creates a Lemon Squeezy checkout for subscriptions or packets
 */

const {
  createSubscriptionCheckout,
  createPacketCheckout,
  PRODUCTS,
  PACKET_PRODUCTS
} = require('../../lib/lemonsqueezy-config');

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { type, tier, packetType, user } = req.body;

    // Validate user info
    if (!user?.email) {
      return res.status(400).json({
        error: 'Email required',
        message: 'Please provide your email address'
      });
    }

    // Create subscription checkout
    if (type === 'subscription') {
      if (!tier || !PRODUCTS[tier]) {
        return res.status(400).json({
          error: 'Invalid tier',
          availableTiers: Object.keys(PRODUCTS)
        });
      }

      const checkout = await createSubscriptionCheckout(tier, {
        id: user.id || `user_${Date.now()}`,
        email: user.email,
        name: user.name || user.email.split('@')[0]
      });

      return res.json({
        success: true,
        checkout: {
          id: checkout.checkoutId,
          url: checkout.checkoutUrl
        },
        tier,
        message: 'Checkout created successfully'
      });
    }

    // Create packet checkout
    if (type === 'packet') {
      if (!packetType || !PACKET_PRODUCTS[packetType]) {
        return res.status(400).json({
          error: 'Invalid packet type',
          availablePackets: Object.keys(PACKET_PRODUCTS)
        });
      }

      // Get discount from user's subscription
      const discountPercent = user.subscriptionDiscount || 0;

      const checkout = await createPacketCheckout(packetType, {
        id: user.id || `guest_${Date.now()}`,
        email: user.email,
        name: user.name || user.email.split('@')[0]
      }, discountPercent);

      return res.json({
        success: true,
        checkout: {
          id: checkout.checkoutId,
          url: checkout.checkoutUrl,
          price: checkout.price
        },
        packetType,
        discountApplied: discountPercent,
        message: 'Packet checkout created successfully'
      });
    }

    return res.status(400).json({
      error: 'Invalid checkout type',
      message: 'Type must be "subscription" or "packet"'
    });

  } catch (error) {
    console.error('Checkout error:', error);
    return res.status(500).json({
      error: 'Checkout failed',
      message: error.message
    });
  }
};
