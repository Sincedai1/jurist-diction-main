/**
 * Tennessee Expungement Packet Generator API
 * Vercel Serverless Function
 *
 * API Endpoint: POST /api/generate-expungement-packet
 *
 * UPL COMPLIANT: This API provides educational information only.
 * All responses include appropriate disclaimers.
 */

const packetGenerator = require('../lib/packet-generator');
const situationAnalyzer = require('../lib/situation-analyzer');
const disclaimers = require('../lib/disclaimers');

/**
 * Main API handler
 */
function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'This endpoint only accepts POST requests'
    });
  }

  try {
    const { action, data } = req.body;

    switch (action) {
      case 'analyze':
        return handleAnalyze(req, res, data);
      case 'generate-packet':
        return handleGeneratePacket(req, res, data);
      case 'get-county-info':
        return handleGetCountyInfo(req, res, data);
      case 'check-eligibility':
        return handleCheckEligibility(req, res, data);
      case 'list-counties':
        return handleListCounties(req, res);
      default:
        return res.status(400).json({
          error: 'Invalid action',
          message: 'Supported actions: analyze, generate-packet, get-county-info, check-eligibility, list-counties',
          disclaimer: disclaimers.getDisclaimer('general', 'short')
        });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      disclaimer: disclaimers.getDisclaimer('general', 'short')
    });
  }
}

/**
 * Handle eligibility analysis
 * POST /api/generate-expungement-packet
 * Body: { action: 'analyze', data: { ...situationData } }
 */
function handleAnalyze(req, res, data) {
  if (!data) {
    return res.status(400).json({
      error: 'Missing data',
      message: 'Situation data is required for analysis',
      disclaimer: disclaimers.getDisclaimer('general', 'short')
    });
  }

  // Validate required fields
  const validation = validateSituationData(data);
  if (!validation.valid) {
    return res.status(400).json({
      error: 'Invalid data',
      message: validation.message,
      missingFields: validation.missingFields,
      disclaimer: disclaimers.getDisclaimer('general', 'short')
    });
  }

  // Perform analysis
  const analysis = situationAnalyzer.analyzeSituation(data);

  return res.status(200).json({
    success: true,
    disclaimer: disclaimers.getDisclaimer('general', 'standard'),
    data: {
      analysis: analysis,
      summary: generateAnalysisSummary(analysis)
    }
  });
}

/**
 * Handle packet generation
 * POST /api/generate-expungement-packet
 * Body: { action: 'generate-packet', data: { situation: {...}, county: '...', format: 'json|text' } }
 */
function handleGeneratePacket(req, res, data) {
  if (!data || !data.situation) {
    return res.status(400).json({
      error: 'Missing data',
      message: 'Situation data is required for packet generation',
      disclaimer: disclaimers.getDisclaimer('general', 'short')
    });
  }

  // Validate required fields
  const validation = validateSituationData(data.situation);
  if (!validation.valid) {
    return res.status(400).json({
      error: 'Invalid data',
      message: validation.message,
      missingFields: validation.missingFields,
      disclaimer: disclaimers.getDisclaimer('general', 'short')
    });
  }

  const format = data.format || 'json';
  const county = data.county || null;

  if (format === 'text') {
    const textPacket = packetGenerator.generateTextPacket({
      situation: data.situation,
      county: county,
      outputFormat: 'text'
    });

    return res.status(200).send(textPacket);
  }

  // Generate JSON packet
  const packet = packetGenerator.generatePacket({
    situation: data.situation,
    county: county,
    outputFormat: 'json'
  });

  return res.status(200).json({
    success: true,
    disclaimer: disclaimers.getDisclaimer('expungement', 'full'),
    data: packet
  });
}

/**
 * Handle county information request
 * POST /api/generate-expungement-packet
 * Body: { action: 'get-county-info', data: { county: '...' } }
 */
function handleGetCountyInfo(req, res, data) {
  if (!data || !data.county) {
    return res.status(400).json({
      error: 'Missing data',
      message: 'County name is required',
      supportedCounties: ['Davidson', 'Shelby', 'Knox'],
      disclaimer: disclaimers.getDisclaimer('general', 'short')
    });
  }

  const countyData = packetGenerator.loadCountyData(data.county);

  if (!countyData) {
    return res.status(404).json({
      error: 'County not found',
      message: `County '${data.county}' is not currently supported`,
      supportedCounties: ['Davidson', 'Shelby', 'Knox'],
      disclaimer: disclaimers.getDisclaimer('general', 'short')
    });
  }

  return res.status(200).json({
    success: true,
    disclaimer: disclaimers.getNotice('countySpecific'),
    data: countyData
  });
}

/**
 * Handle quick eligibility check
 * POST /api/generate-expungement-packet
 * Body: { action: 'check-eligibility', data: { chargeType: '...', outcome: '...', ... } }
 */
function handleCheckEligibility(req, res, data) {
  if (!data) {
    return res.status(400).json({
      error: 'Missing data',
      message: 'Eligibility data is required',
      disclaimer: disclaimers.getDisclaimer('general', 'short')
    });
  }

  // Minimal validation for quick check
  if (!data.chargeType && !data.chargeDescription && !data.outcome) {
    return res.status(400).json({
      error: 'Insufficient data',
      message: 'Please provide charge type or charge description and outcome',
      disclaimer: disclaimers.getDisclaimer('general', 'short')
    });
  }

  // Perform analysis
  const analysis = situationAnalyzer.analyzeSituation(data);

  // Return simplified eligibility response
  return res.status(200).json({
    success: true,
    disclaimer: disclaimers.getNotice('eligibility'),
    data: {
      eligibility: {
        status: analysis.eligibility.status,
        confidence: analysis.eligibility.confidence,
        waitingPeriod: analysis.eligibility.waitingPeriod,
        waitingPeriodMet: analysis.eligibility.waitingPeriodMet,
        reasons: analysis.eligibility.reasons,
        blockingFactors: analysis.eligibility.blockingFactors
      },
      nextSteps: analysis.nextSteps.slice(0, 3),
      recommendation: getQuickRecommendation(analysis)
    }
  });
}

/**
 * Handle list counties request
 * GET/POST /api/generate-expungement-packet
 * Body: { action: 'list-counties' }
 */
function handleListCounties(req, res) {
  const counties = [
    {
      name: 'Davidson',
      countySeat: 'Nashville',
      judicialDistrict: '20th Judicial District',
      administrativeFee: '$0',
      features: ['Free expungement clinic', 'Self-help center', 'No administrative fee']
    },
    {
      name: 'Shelby',
      countySeat: 'Memphis',
      judicialDistrict: '30th Judicial District',
      administrativeFee: '$25',
      features: ['Monthly expungement clinic', 'Reentry services', 'Must serve DA separately']
    },
    {
      name: 'Knox',
      countySeat: 'Knoxville',
      judicialDistrict: '6th Judicial District',
      administrativeFee: '$15',
      features: ['Evening expungement clinic', 'Electronic filing', 'Law library resources']
    }
  ];

  return res.status(200).json({
    success: true,
    disclaimer: disclaimers.getDisclaimer('general', 'short'),
    data: {
      counties: counties,
      total: counties.length,
      note: 'More counties will be added in future updates. For counties not listed, contact the local court clerk for procedures.'
    }
  });
}

/**
 * Validate situation data
 */
function validateSituationData(data) {
  const result = {
    valid: true,
    message: '',
    missingFields: []
  };

  // At minimum, we need some identifying information
  if (!data.chargeType && !data.chargeDescription) {
    result.valid = false;
    result.missingFields.push('chargeType or chargeDescription');
  }

  if (!data.outcome) {
    result.valid = false;
    result.missingFields.push('outcome');
  }

  if (!result.valid) {
    result.message = `Missing required fields: ${result.missingFields.join(', ')}`;
  }

  return result;
}

/**
 * Generate a summary of the analysis
 */
function generateAnalysisSummary(analysis) {
  const summary = {
    status: analysis.eligibility.status,
    confidence: analysis.eligibility.confidence,
    canProceedNow: false,
    mainBlocker: null,
    topActions: []
  };

  // Determine if can proceed
  if (analysis.eligibility.status === 'eligible' && analysis.eligibility.waitingPeriodMet !== false) {
    summary.canProceedNow = true;
  }

  // Identify main blocker
  if (analysis.eligibility.blockingFactors.length > 0) {
    summary.mainBlocker = analysis.eligibility.blockingFactors[0].factor;
  } else if (!analysis.eligibility.waitingPeriodMet) {
    summary.mainBlocker = `Waiting period not complete (${analysis.eligibility.waitingPeriod})`;
  } else if (analysis.eligibility.status === 'pending') {
    summary.mainBlocker = 'Requirements not yet satisfied';
  }

  // Get top actions
  summary.topActions = analysis.recommendations.slice(0, 3).map(r => r.action);

  return summary;
}

/**
 * Get a quick recommendation based on analysis
 */
function getQuickRecommendation(analysis) {
  if (analysis.eligibility.status === 'eligible') {
    return 'You may be eligible for expungement. Obtain your criminal records and consult with an attorney or the court clerk to verify eligibility before filing.';
  }

  if (analysis.eligibility.status === 'ineligible') {
    if (analysis.eligibility.blockingFactors.length > 0) {
      return `Based on the information provided, you may not be eligible for expungement due to: ${analysis.eligibility.blockingFactors[0].description}. Consult with an attorney to discuss your options.`;
    }
    return 'Based on the information provided, you may not be eligible for expungement. Consult with an attorney to review your specific case.';
  }

  if (analysis.eligibility.status === 'pending') {
    return 'Additional requirements must be completed before you can file for expungement. Review the requirements and timeline in your packet.';
  }

  return 'More information is needed to determine eligibility. Obtain your complete criminal records and consult with an attorney.';
}

/**
 * GET handler for API documentation
 */
function getApiDocumentation() {
  return {
    endpoint: '/api/generate-expungement-packet',
    method: 'POST',
    contentType: 'application/json',
    actions: [
      {
        action: 'analyze',
        description: 'Analyze eligibility for expungement',
        requiredData: ['chargeType or chargeDescription', 'outcome'],
        optionalData: ['county', 'convictionDate', 'sentenceCompletionDate', 'allFinesPaid', 'probationCompleted', 'diversionCompleted', 'hasPendingCharges']
      },
      {
        action: 'generate-packet',
        description: 'Generate a complete expungement information packet',
        requiredData: ['situation object with charge and outcome info'],
        optionalData: ['county', 'format (json|text)']
      },
      {
        action: 'get-county-info',
        description: 'Get county-specific court and filing information',
        requiredData: ['county name']
      },
      {
        action: 'check-eligibility',
        description: 'Quick eligibility check',
        requiredData: ['chargeType or chargeDescription', 'outcome']
      },
      {
        action: 'list-counties',
        description: 'List supported Tennessee counties',
        requiredData: []
      }
    ],
    supportedCounties: ['Davidson', 'Shelby', 'Knox'],
    disclaimer: disclaimers.getDisclaimer('general', 'standard')
  };
}

/**
 * Export for Vercel serverless function
 */
module.exports = handler;
module.exports.getApiDocumentation = getApiDocumentation;
