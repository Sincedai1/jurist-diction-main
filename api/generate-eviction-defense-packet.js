/**
 * Multi-State Eviction Defense Packet Generator API
 * Vercel serverless function for generating eviction defense packets
 *
 * Supports: Tennessee (TN), Pennsylvania (PA), New Jersey (NJ), Mississippi (MS)
 *
 * Endpoint: POST /api/generate-eviction-defense-packet
 *
 * Request Body:
 * {
 *   "state": "nj",           // Required: tn, pa, nj, or ms
 *   "evictionReason": "non-payment of rent",
 *   "county": "essex",
 *   "noticeReceived": true,
 *   "noticeDate": "2026-02-10",
 *   "filingDate": "2026-02-28",
 *   "courtDate": "2026-03-05",
 *   ...
 * }
 *
 * UPL COMPLIANT: This API provides informational packets only, not legal advice.
 */

const packetGenerator = require('../lib/eviction-packet-generator-multistate');

/**
 * Main API handler for Vercel serverless function
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

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST to generate eviction defense packet.'
    });
  }

  try {
    const { action, data, format, state } = req.body;

    // Handle different actions
    switch (action) {
      case 'analyze':
        return handleAnalyze(req, res, data);
      case 'generate':
        return handleGenerate(req, res, data, format);
      case 'states':
        return handleStates(req, res);
      case 'counties':
        return handleCounties(req, res, state || req.body.countiesForState);
      case 'eviction-types':
        return handleEvictionTypes(req, res, state || req.body.evictionTypesForState);
      case 'state-info':
        return handleStateInfo(req, res, state || req.body.stateInfoFor);
      default:
        // Default: generate packet
        return handleGenerate(req, res, req.body, format);
    }
  } catch (error) {
    console.error('Eviction Defense API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while generating the eviction defense packet.',
      message: error.message
    });
  }
}

/**
 * Handle analyze-only request (returns analysis without full packet)
 */
function handleAnalyze(req, res, data) {
  if (!data) {
    return res.status(400).json({
      success: false,
      error: 'Situation data is required for analysis'
    });
  }

  // Validate required fields
  const validation = validateInput(data);
  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      issues: validation.issues
    });
  }

  try {
    const result = packetGenerator.generatePacketJson(data);
    return res.status(200).json({
      success: true,
      action: 'analyze',
      analysis: result.analysis,
      defenses: result.defenses,
      nextSteps: result.nextSteps,
      resources: result.resources,
      disclaimer: result.disclaimer
    });
  } catch (error) {
    console.error('Analysis error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to analyze situation',
      message: error.message
    });
  }
}

/**
 * Handle full packet generation
 */
function handleGenerate(req, res, data, format = 'json') {
  if (!data) {
    return res.status(400).json({
      success: false,
      error: 'Situation data is required to generate packet'
    });
  }

  // Validate required fields
  const validation = validateInput(data);
  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      issues: validation.issues
    });
  }

  try {
    switch (format) {
      case 'text':
        const textPacket = packetGenerator.generatePacketText(data);
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename="${textPacket.filename}"`);
        return res.status(200).send(textPacket.content);

      case 'markdown':
        const mdPacket = packetGenerator.generatePacketMarkdown(data);
        res.setHeader('Content-Type', 'text/markdown');
        res.setHeader('Content-Disposition', `attachment; filename="${mdPacket.filename}"`);
        return res.status(200).send(mdPacket.content);

      case 'json':
      default:
        const jsonPacket = packetGenerator.generatePacketJson(data);
        return res.status(200).json(jsonPacket);
    }
  } catch (error) {
    console.error('Packet generation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate eviction defense packet',
      message: error.message
    });
  }
}

/**
 * Handle states list request
 */
function handleStates(req, res) {
  const states = packetGenerator.getSupportedStates();

  return res.status(200).json({
    success: true,
    action: 'states',
    states: states,
    note: 'All states supported have self-help eviction prohibitions and tenant protections'
  });
}

/**
 * Handle counties list request
 */
function handleCounties(req, res, state) {
  if (!state) {
    // Return all counties for all states
    const allCounties = {};
    Object.keys(packetGenerator.STATE_CONFIG).forEach(stateCode => {
      allCounties[stateCode.toUpperCase()] = packetGenerator.getCountiesForState(stateCode);
    });

    return res.status(200).json({
      success: true,
      action: 'counties',
      countiesByState: allCounties,
      note: 'Specify state parameter to get counties for a specific state'
    });
  }

  const stateLower = state.toLowerCase();

  if (!packetGenerator.STATE_CONFIG[stateLower]) {
    return res.status(400).json({
      success: false,
      error: `Unsupported state: ${state}`,
      supportedStates: Object.keys(packetGenerator.STATE_CONFIG).map(s => s.toUpperCase())
    });
  }

  const counties = packetGenerator.getCountiesForState(stateLower);
  const stateConfig = packetGenerator.STATE_CONFIG[stateLower];

  return res.status(200).json({
    success: true,
    action: 'counties',
    state: stateConfig.name,
    stateCode: state.toUpperCase(),
    counties: counties,
    note: `Counties with detailed court information for ${stateConfig.name}`
  });
}

/**
 * Handle eviction types list request
 */
function handleEvictionTypes(req, res, state) {
  if (!state) {
    return res.status(400).json({
      success: false,
      error: 'State parameter required',
      supportedStates: Object.keys(packetGenerator.STATE_CONFIG).map(s => s.toUpperCase())
    });
  }

  const stateLower = state.toLowerCase();

  if (!packetGenerator.STATE_CONFIG[stateLower]) {
    return res.status(400).json({
      success: false,
      error: `Unsupported state: ${state}`,
      supportedStates: Object.keys(packetGenerator.STATE_CONFIG).map(s => s.toUpperCase())
    });
  }

  const evictionTypes = packetGenerator.getEvictionTypes(stateLower);
  const stateConfig = packetGenerator.STATE_CONFIG[stateLower];

  return res.status(200).json({
    success: true,
    action: 'eviction-types',
    state: stateConfig.name,
    stateCode: state.toUpperCase(),
    evictionTypes: evictionTypes,
    tenantProtectionRating: stateConfig.tenantProtectionRating || null,
    note: `Notice periods for ${stateConfig.name}`
  });
}

/**
 * Handle state info request
 */
function handleStateInfo(req, res, state) {
  if (!state) {
    return res.status(400).json({
      success: false,
      error: 'State parameter required',
      supportedStates: Object.keys(packetGenerator.STATE_CONFIG).map(s => s.toUpperCase())
    });
  }

  const stateLower = state.toLowerCase();

  if (!packetGenerator.STATE_CONFIG[stateLower]) {
    return res.status(400).json({
      success: false,
      error: `Unsupported state: ${state}`,
      supportedStates: Object.keys(packetGenerator.STATE_CONFIG).map(s => s.toUpperCase())
    });
  }

  try {
    const { statutes, procedures, config } = packetGenerator.loadStateData(stateLower);

    return res.status(200).json({
      success: true,
      action: 'state-info',
      state: config.name,
      stateCode: state.toUpperCase(),
      tenantProtectionRating: config.tenantProtectionRating || null,
      noticePeriods: config.noticePeriods,
      appealDays: config.appealDays,
      courts: config.courts,
      keyProtections: statutes.tenantProtectionHighlights || statutes.resources?.tenantProtectionHighlights || [],
      legalAid: statutes.resources?.legalAid?.statewide || null
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to load state information',
      message: error.message
    });
  }
}

/**
 * Validate input data
 * @param {object} data - Input data to validate
 * @returns {object} Validation result
 */
function validateInput(data) {
  const issues = [];

  // Check for state
  if (!data.state) {
    issues.push({
      field: 'state',
      message: 'State is required. Supported states: TN, PA, NJ, MS'
    });
  } else {
    const stateLower = data.state.toLowerCase();
    if (!packetGenerator.STATE_CONFIG[stateLower]) {
      issues.push({
        field: 'state',
        message: `Unsupported state: ${data.state}. Supported states: TN, PA, NJ, MS`
      });
    }
  }

  // Check for at least eviction reason
  if (!data.evictionReason && !data.reason) {
    issues.push({
      field: 'evictionReason',
      message: 'Eviction reason is required to analyze your situation'
    });
  }

  // Validate dates if provided
  if (data.noticeDate && !isValidDate(data.noticeDate)) {
    issues.push({
      field: 'noticeDate',
      message: 'Invalid notice date format. Use YYYY-MM-DD format.'
    });
  }

  if (data.courtDate && !isValidDate(data.courtDate)) {
    issues.push({
      field: 'courtDate',
      message: 'Invalid court date format. Use YYYY-MM-DD format.'
    });
  }

  if (data.filingDate && !isValidDate(data.filingDate)) {
    issues.push({
      field: 'filingDate',
      message: 'Invalid filing date format. Use YYYY-MM-DD format.'
    });
  }

  // Validate county if provided
  if (data.state && data.county) {
    const stateLower = data.state.toLowerCase();
    const countyLower = data.county.toLowerCase();
    const counties = packetGenerator.COUNTY_FILES[stateLower];

    if (counties && !counties[countyLower]) {
      issues.push({
        field: 'county',
        message: `County "${data.county}" may not have detailed information available for ${data.state.toUpperCase()}`,
        availableCounties: Object.keys(counties)
      });
    }
  }

  return {
    valid: issues.length === 0,
    issues: issues
  };
}

/**
 * Check if a string is a valid date
 */
function isValidDate(dateString) {
  if (!dateString) return false;

  // Check YYYY-MM-DD format
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;

  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * Example request body for documentation
 */
const exampleRequest = {
  action: 'generate', // or 'analyze', 'states', 'counties', 'eviction-types', 'state-info'
  format: 'json', // or 'text', 'markdown'
  state: 'nj', // Required: tn, pa, nj, or ms
  // Situation data (for generate/analyze):
  evictionReason: 'non-payment of rent',
  county: 'essex',
  noticeReceived: true,
  noticeDate: '2026-02-10',
  noticeType: '30-day notice to cease and quit',
  filingDate: '2026-02-28',
  courtDate: '2026-03-07',
  paymentMade: false,
  propertyCondition: 'poor',
  recentComplaint: true,
  partialPaymentAccepted: false
};

/**
 * Example response for documentation
 */
const exampleResponse = {
  success: true,
  metadata: {
    generatedAt: '2026-02-21T12:00:00.000Z',
    version: '2.0.0',
    jurisdiction: 'New Jersey',
    stateCode: 'NJ',
    packetType: 'eviction-defense',
    tenantProtectionRating: 'STRONGEST IN THE UNITED STATES'
  },
  summary: {
    evictionType: 'Non-Payment of Rent',
    urgencyLevel: 'urgent',
    topDefense: 'Improper Notice',
    nextStep: 'Contact Legal Aid',
    timelineIssues: 0,
    state: 'New Jersey',
    county: 'Essex',
    courtDate: '2026-03-07'
  },
  analysis: {
    evictionType: {
      type: 'nonpayment',
      displayName: 'Non-Payment of Rent',
      noticeRequired: 30
    },
    timelineAnalysis: {
      noticeGiven: true,
      issues: []
    },
    urgencyLevel: 'urgent'
  },
  defenses: [],
  nextSteps: [],
  disclaimer: 'This is informational only and does not constitute legal advice...'
};

/**
 * Export for Vercel serverless function
 */
module.exports = handler;
