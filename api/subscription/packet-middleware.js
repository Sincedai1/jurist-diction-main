/**
 * Subscription Middleware for Packet APIs
 * Enforces subscription-based access to packet generation features
 */

const { getTier, hasToolAccess } = require('./subscription-tiers');

/**
 * Packet pricing (per packet)
 */
const PACKET_PRICING = {
  'traffic-ticket': {
    basePrice: 9.99,
    description: 'Traffic Ticket Defense Packet'
  },
  'expungement': {
    basePrice: 19.99,
    description: 'Expungement Information Packet'
  },
  'eviction-defense': {
    basePrice: 14.99,
    description: 'Eviction Defense Packet'
  },
  'dl-reinstatement': {
    basePrice: 9.99,
    description: 'Driver\'s License Reinstatement Packet'
  },
  'foreclosure-prevention': {
    basePrice: 14.99,
    description: 'Foreclosure Prevention Packet'
  }
};

/**
 * Check if user has packet access
 * @param {string} tierId - Subscription tier ID
 * @param {string} packetType - Type of packet
 * @param {string} state - State code
 * @returns {object} - Access check result
 */
function checkPacketAccess(tierId, packetType, state = 'TN') {
  const tier = getTier(tierId);

  if (!tier) {
    return {
      hasAccess: false,
      reason: 'Invalid subscription tier',
      upgradeUrl: '/subscribe'
    };
  }

  const packetConfig = tier.features.packets;

  if (!packetConfig.included) {
    return {
      hasAccess: false,
      reason: 'Packet generation not included in your plan',
      upgradeUrl: '/subscribe/upgrade'
    };
  }

  // Check packet type access
  if (packetConfig.types !== 'all' && !packetConfig.types.includes(packetType)) {
    return {
      hasAccess: false,
      reason: `${packetType} packets require a higher tier subscription`,
      upgradeUrl: '/subscribe/upgrade'
    };
  }

  // Check state access
  if (packetConfig.states !== 'all' && !packetConfig.states.includes(state)) {
    return {
      hasAccess: false,
      reason: `${state} packets require Professional or Firm subscription`,
      upgradeUrl: '/subscribe/upgrade'
    };
  }

  // Calculate pricing
  const basePrice = PACKET_PRICING[packetType]?.basePrice || 9.99;
  const discount = packetConfig.discountPercent || 0;
  const finalPrice = basePrice * (1 - discount / 100);

  return {
    hasAccess: true,
    tier: tierId,
    packetType,
    state,
    pricing: {
      basePrice,
      discountPercent: discount,
      finalPrice: Math.round(finalPrice * 100) / 100
    },
    limits: {
      monthlyLimit: packetConfig.monthlyLimit,
      countyAccess: packetConfig.countyAccess
    }
  };
}

/**
 * Check monthly packet limit
 * @param {string} userId - User ID
 * @param {string} tierId - Subscription tier ID
 * @param {object} usageData - Current month usage data
 * @returns {object} - Limit check result
 */
function checkMonthlyLimit(userId, tierId, usageData = {}) {
  const tier = getTier(tierId);

  if (!tier) {
    return { withinLimit: false, reason: 'Invalid subscription' };
  }

  const packetConfig = tier.features.packets;
  const monthlyLimit = packetConfig.monthlyLimit;

  // Unlimited
  if (monthlyLimit === -1) {
    return {
      withinLimit: true,
      remaining: 'unlimited',
      used: usageData.packetsGenerated || 0
    };
  }

  const used = usageData.packetsGenerated || 0;
  const remaining = monthlyLimit - used;

  return {
    withinLimit: remaining > 0,
    used,
    limit: monthlyLimit,
    remaining: Math.max(0, remaining)
  };
}

/**
 * Get packet access for user
 * @param {object} user - User object with subscription info
 * @returns {object} - Available packets and pricing
 */
function getAvailablePackets(user) {
  const tier = getTier(user.subscriptionTier || 'basic');

  if (!tier) {
    return { packets: [], states: [] };
  }

  const packetConfig = tier.features.packets;
  const availablePackets = [];

  for (const [type, pricing] of Object.entries(PACKET_PRICING)) {
    const hasTypeAccess = packetConfig.types === 'all' || packetConfig.types.includes(type);

    if (hasTypeAccess) {
      const discount = packetConfig.discountPercent || 0;
      availablePackets.push({
        type,
        name: pricing.description,
        basePrice: pricing.basePrice,
        discountPercent: discount,
        finalPrice: Math.round(pricing.basePrice * (1 - discount / 100) * 100) / 100,
        states: packetConfig.states === 'all' ? ['TN', 'PA', 'NJ', 'MS'] : packetConfig.states
      });
    }
  }

  return {
    tier: tier.id,
    tierName: tier.name,
    packets: availablePackets,
    allStates: packetConfig.states === 'all',
    monthlyLimit: packetConfig.monthlyLimit === -1 ? 'unlimited' : packetConfig.monthlyLimit,
    countyAccess: packetConfig.countyAccess
  };
}

/**
 * Middleware wrapper for packet APIs
 * @param {function} handler - Original API handler
 * @param {string} packetType - Type of packet
 * @returns {function} - Wrapped handler with subscription check
 */
function withSubscriptionCheck(handler, packetType) {
  return async (req, res) => {
    // Get user from request (assuming auth middleware runs first)
    const user = req.user || { subscriptionTier: 'basic' };
    const state = req.body?.data?.state || req.body?.state || 'TN';

    // Check access
    const accessCheck = checkPacketAccess(user.subscriptionTier, packetType, state);

    if (!accessCheck.hasAccess) {
      return res.status(403).json({
        error: 'Subscription required',
        message: accessCheck.reason,
        upgradeUrl: accessCheck.upgradeUrl,
        packetType,
        state
      });
    }

    // Check monthly limit (would need database integration)
    const limitCheck = checkMonthlyLimit(user.id, user.subscriptionTier, user.usageData);

    if (!limitCheck.withinLimit) {
      return res.status(429).json({
        error: 'Monthly limit exceeded',
        message: `You have used ${limitCheck.used} of ${limitCheck.limit} monthly packets`,
        upgradeUrl: '/subscribe/upgrade'
      });
    }

    // Add pricing info to request
    req.packetPricing = accessCheck.pricing;
    req.packetLimits = accessCheck.limits;

    // Call original handler
    return handler(req, res);
  };
}

/**
 * Get subscription tiers for packets
 */
function getPacketTierComparison() {
  return {
    tiers: [
      {
        id: 'basic',
        name: 'Basic',
        price: 29,
        packetFeatures: {
          included: true,
          types: ['dl-reinstatement', 'foreclosure-prevention'],
          states: ['TN'],
          monthlyLimit: 5,
          discount: '10%'
        }
      },
      {
        id: 'professional',
        name: 'Professional',
        price: 79,
        packetFeatures: {
          included: true,
          types: ['all'],
          states: ['TN', 'PA', 'NJ', 'MS'],
          monthlyLimit: 25,
          countyAccess: 'partial',
          discount: '25%'
        },
        popular: true
      },
      {
        id: 'firm',
        name: 'Firm',
        price: 299,
        packetFeatures: {
          included: true,
          types: ['all'],
          states: ['all'],
          monthlyLimit: 'unlimited',
          countyAccess: 'full (713 counties)',
          discount: '40%',
          customBranding: true
        }
      }
    ]
  };
}

module.exports = {
  checkPacketAccess,
  checkMonthlyLimit,
  getAvailablePackets,
  withSubscriptionCheck,
  getPacketTierComparison,
  PACKET_PRICING
};
