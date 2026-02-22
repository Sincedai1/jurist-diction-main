/**
 * Subscription Tiers Configuration
 * Defines available subscription plans and their features
 */

const SUBSCRIPTION_TIERS = {
  basic: {
    id: 'basic',
    name: 'Basic',
    price: 29,
    interval: 'month',
    stripePriceId: 'price_basic_monthly', // To be configured in Stripe
    features: {
      tools: ['document-parser', 'legal-auditor', 'case-log-analyzer'],
      whitepapers: {
        included: true,
        limit: 1, // 1 per month
        availableTopics: ['dui-tennessee', 'foreclosure-tennessee', 'custody-tennessee']
      },
      processing: {
        documentsPerMonth: 50,
        maxFileSize: 5, // MB
        supportedFormats: ['pdf', 'docx', 'txt']
      },
      support: {
        type: 'email',
        responseTime: '48 hours'
      },
      community: {
        accessLevel: 'public' // Telegram only
      },
      packets: {
        included: true,
        types: ['dl-reinstatement', 'foreclosure-prevention'], // TN only
        states: ['TN'],
        monthlyLimit: 5,
        discountPercent: 10
      }
    },
    description: 'Essential tools for occasional document review',
    popular: false
  },

  professional: {
    id: 'professional',
    name: 'Professional',
    price: 79,
    interval: 'month',
    stripePriceId: 'price_professional_monthly',
    features: {
      tools: ['document-parser', 'legal-auditor', 'case-log-analyzer', 'legalese-simplifier', 'whitepaper-generator'],
      whitepapers: {
        included: true,
        limit: 4, // 4 per month
        availableTopics: ['all'] // All topics
      },
      processing: {
        documentsPerMonth: 500,
        maxFileSize: 10, // MB
        supportedFormats: ['pdf', 'docx', 'txt', 'rtf']
      },
      support: {
        type: 'priority-email',
        responseTime: '24 hours'
      },
      community: {
        accessLevel: 'premium' // Discord + Telegram
      },
      packets: {
        included: true,
        types: ['traffic-ticket', 'expungement', 'eviction-defense', 'dl-reinstatement', 'foreclosure-prevention'],
        states: ['TN', 'PA', 'NJ', 'MS'],
        monthlyLimit: 25,
        countyAccess: 'partial', // Major counties only
        discountPercent: 25
      }
    },
    description: 'Complete toolkit for serious legal document management',
    popular: true
  },

  firm: {
    id: 'firm',
    name: 'Firm',
    price: 299,
    interval: 'month',
    stripePriceId: 'price_firm_monthly',
    features: {
      tools: ['document-parser', 'legal-auditor', 'case-log-analyzer', 'legalese-simplifier', 'whitepaper-generator', 'api-access'],
      whitepapers: {
        included: true,
        limit: -1, // Unlimited
        availableTopics: ['all']
      },
      processing: {
        documentsPerMonth: -1, // Unlimited
        maxFileSize: 50, // MB
        supportedFormats: ['pdf', 'docx', 'txt', 'rtf', 'html']
      },
      support: {
        type: 'dedicated',
        responseTime: '4 hours',
        features: ['phone-support', 'training']
      },
      community: {
        accessLevel: 'vip'
      },
      packets: {
        included: true,
        types: ['all'], // All packet types
        states: ['all'], // All supported states
        monthlyLimit: -1, // Unlimited
        countyAccess: 'full', // All 713 counties
        customBranding: true,
        discountPercent: 40,
        bulkPricing: true
      },
      api: {
        included: true,
        requestsPerMonth: 10000,
        webhooks: true
      },
      customization: {
        whitepaperBranding: true,
        customTemplates: true
      }
    },
    description: 'Enterprise solution for law firms and high-volume users',
    popular: false
  }
};

/**
 * Get subscription tier by ID
 */
function getTier(tierId) {
  return SUBSCRIPTION_TIERS[tierId] || null;
}

/**
 * Get all subscription tiers
 */
function getAllTiers() {
  return Object.values(SUBSCRIPTION_TIERS);
}

/**
 * Get popular tier (for highlighting in pricing table)
 */
function getPopularTier() {
  return Object.values(SUBSCRIPTION_TIERS).find(tier => tier.popular) || null;
}

/**
 * Check if tier has access to specific tool
 */
function hasToolAccess(tierId, toolId) {
  const tier = getTier(tierId);
  if (!tier) return false;

  return tier.features.tools.includes(toolId);
}

/**
 * Check if tier has access to specific whitepaper topic
 */
function hasWhitepaperAccess(tierId, topic) {
  const tier = getTier(tierId);
  if (!tier) return false;

  const whitepaperConfig = tier.features.whitepapers;
  if (!whitepaperConfig.included) return false;

  if (whitepaperConfig.availableTopics.includes('all')) return true;
  return whitepaperConfig.availableTopics.includes(topic);
}

/**
 * Get whitepaper limit for tier
 */
function getWhitepaperLimit(tierId) {
  const tier = getTier(tierId);
  if (!tier) return 0;

  return tier.features.whitepapers.limit;
}

/**
 * Get document processing limit for tier
 */
function getDocumentLimit(tierId) {
  const tier = getTier(tierId);
  if (!tier) return 0;

  return tier.features.processing.documentsPerMonth;
}

/**
 * Get packet discount percentage for tier
 */
function getPacketDiscount(tierId) {
  const tier = getTier(tierId);
  if (!tier) return 0;

  return tier.features.packets.discountPercent;
}

/**
 * Calculate discounted packet price for subscriber
 */
function getDiscountedPacketPrice(tierId, originalPrice) {
  const discount = getPacketDiscount(tierId);
  return Math.round(originalPrice * (1 - discount / 100));
}

/**
 * Compare tiers and show upgrade benefits
 */
function getUpgradeBenefits(currentTierId, targetTierId) {
  const current = getTier(currentTierId);
  const target = getTier(targetTierId);

  if (!current || !target) return [];

  const benefits = [];

  // Compare tools
  const newTools = target.features.tools.filter(
    tool => !current.features.tools.includes(tool)
  );
  if (newTools.length > 0) {
    benefits.push({
      category: 'Tools',
      items: newTools
    });
  }

  // Compare whitepaper limits
  if (target.features.whitepapers.limit > current.features.whitepapers.limit) {
    benefits.push({
      category: 'Whitepapers',
      items: [`Increase from ${current.features.whitepapers.limit} to ${target.features.whitepapers.limit} per month`]
    });
  }

  // Compare document limits
  if (target.features.processing.documentsPerMonth > current.features.processing.documentsPerMonth) {
    benefits.push({
      category: 'Processing',
      items: [`Increase from ${current.features.processing.documentsPerMonth} to ${target.features.processing.documentsPerMonth} documents/month`]
    });
  }

  // Compare support
  if (target.features.support.type !== current.features.support.type) {
    benefits.push({
      category: 'Support',
      items: [`Upgrade to ${target.features.support.type} support (${target.features.support.responseTime} response)`]
    });
  }

  // Compare packet discount
  if (target.features.packets.discountPercent > current.features.packets.discountPercent) {
    benefits.push({
      category: 'Packets',
      items: [`Increase packet discount from ${current.features.packets.discountPercent}% to ${target.features.packets.discountPercent}%`]
    });
  }

  return benefits;
}

/**
 * Get tier comparison table
 */
function getTierComparison() {
  const tiers = getAllTiers();

  const comparison = {
    tiers: tiers.map(tier => ({
      id: tier.id,
      name: tier.name,
      price: tier.price,
      popular: tier.popular
    })),
    features: [
      {
        name: 'Document Parser',
        values: {
          basic: true,
          professional: true,
          firm: true
        }
      },
      {
        name: 'Legal Auditor',
        values: {
          basic: true,
          professional: true,
          firm: true
        }
      },
      {
        name: 'Case Log Analyzer',
        values: {
          basic: true,
          professional: true,
          firm: true
        }
      },
      {
        name: 'Legalese Simplifier',
        values: {
          basic: false,
          professional: true,
          firm: true
        }
      },
      {
        name: 'Whitepaper Generator',
        values: {
          basic: false,
          professional: true,
          firm: true
        }
      },
      {
        name: 'API Access',
        values: {
          basic: false,
          professional: false,
          firm: true
        }
      },
      {
        name: 'Monthly Documents',
        values: {
          basic: '50',
          professional: '500',
          firm: 'Unlimited'
        }
      },
      {
        name: 'Monthly Whitepapers',
        values: {
          basic: '1',
          professional: '4',
          firm: 'Unlimited'
        }
      },
      {
        name: 'Packet Discount',
        values: {
          basic: '10%',
          professional: '25%',
          firm: '40%'
        }
      },
      {
        name: 'Support Response Time',
        values: {
          basic: '48 hours',
          professional: '24 hours',
          firm: '4 hours'
        }
      },
      {
        name: 'Community Access',
        values: {
          basic: 'Telegram',
          professional: 'Discord + Telegram',
          firm: 'VIP Channels'
        }
      },
      {
        name: 'Custom Branding',
        values: {
          basic: false,
          professional: false,
          firm: true
        }
      }
    ]
  };

  return comparison;
}

/**
 * Calculate annual savings
 */
function calculateAnnualSavings(tierId) {
  const tier = getTier(tierId);
  if (!tier) return 0;

  const monthlyPrice = tier.price;
  const annualPrice = monthlyPrice * 12;

  // Offer 20% discount for annual billing
  const discountedAnnual = Math.round(annualPrice * 0.8);

  return {
    monthlyTotal: annualPrice,
    annualPrice: discountedAnnual,
    savings: annualPrice - discountedAnnual,
    savingsPercent: 20
  };
}

module.exports = {
  SUBSCRIPTION_TIERS,
  getTier,
  getAllTiers,
  getPopularTier,
  hasToolAccess,
  hasWhitepaperAccess,
  getWhitepaperLimit,
  getDocumentLimit,
  getPacketDiscount,
  getDiscountedPacketPrice,
  getUpgradeBenefits,
  getTierComparison,
  calculateAnnualSavings
};
