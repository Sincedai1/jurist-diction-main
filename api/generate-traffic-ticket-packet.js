/**
 * API Endpoint: Generate Traffic Ticket Defense Packet
 * Vercel serverless function for multi-state traffic ticket defense packet generation
 *
 * Supported States: Tennessee (TN), Pennsylvania (PA), New Jersey (NJ), Mississippi (MS)
 *
 * UPL COMPLIANCE: This endpoint provides legal information only, NOT legal advice.
 */

const packetGenerator = require('../lib/traffic-ticket-generator');

// State configuration
const STATE_CONFIG = {
  tn: {
    name: 'Tennessee',
    code: 'TN',
    statutesCode: 'TCA',
    barAssociation: 'Tennessee Bar Association',
    barPhone: '(615) 742-6272',
    barWebsite: 'www.tba.org',
    dosName: 'Tennessee Department of Safety',
    dosPhone: '(615) 741-3954',
    dosWebsite: 'www.tn.gov/safety',
    counties: ['davidson', 'shelby', 'knox', 'hamilton', 'rutherford', 'williamson']
  },
  pa: {
    name: 'Pennsylvania',
    code: 'PA',
    statutesCode: '75 Pa.C.S.',
    barAssociation: 'Pennsylvania Bar Association',
    barPhone: '(800) 932-0311',
    barWebsite: 'www.pabar.org',
    dosName: 'Pennsylvania Department of Transportation (PennDOT)',
    dosPhone: '(717) 412-5300',
    dosWebsite: 'www.penndot.gov',
    counties: ['philadelphia', 'allegheny', 'bucks', 'montgomery', 'delaware', 'chester']
  },
  nj: {
    name: 'New Jersey',
    code: 'NJ',
    statutesCode: 'N.J.S.A.',
    barAssociation: 'New Jersey State Bar Association',
    barPhone: '(732) 249-5000',
    barWebsite: 'www.njsba.com',
    dosName: 'New Jersey Motor Vehicle Commission (NJMVC)',
    dosPhone: '(609) 292-6500',
    dosWebsite: 'www.nj.gov/mvc',
    counties: ['bergen', 'essex', 'hudson', 'middlesex', 'monmouth', 'ocean', 'union']
  },
  ms: {
    name: 'Mississippi',
    code: 'MS',
    statutesCode: 'MS Code',
    barAssociation: 'Mississippi Bar',
    barPhone: '(601) 948-3149',
    barWebsite: 'www.msbar.org',
    dosName: 'Mississippi Department of Public Safety',
    dosPhone: '(601) 987-1212',
    dosWebsite: 'www.dps.ms.gov',
    counties: ['hinds', 'harrison', 'desoto', 'rankin', 'jackson', 'madison']
  }
};

/**
 * Normalize state input to state code
 */
function normalizeState(state) {
  if (!state) return 'tn'; // Default to Tennessee for backward compatibility

  const stateLower = state.toLowerCase().trim();

  const stateMap = {
    'tn': 'tn',
    'tennessee': 'tn',
    'pa': 'pa',
    'pennsylvania': 'pa',
    'penn': 'pa',
    'nj': 'nj',
    'new jersey': 'nj',
    'newjersey': 'nj',
    'ms': 'ms',
    'mississippi': 'ms',
    'miss': 'ms'
  };

  return stateMap[stateLower] || stateLower;
}

/**
 * Main API handler for traffic ticket packet generation
 */
function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return handleGetInfo(req, res);
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, data } = req.body;

    switch (action) {
      case 'generate':
        return handleGeneratePacket(req, res);
      case 'analyze':
        return handleAnalyzeViolation(req, res);
      case 'get-county':
        return handleGetCountyInfo(req, res);
      case 'get-statute':
        return handleGetStatuteInfo(req, res);
      case 'validate':
        return handleValidateData(req, res);
      case 'get-states':
        return handleGetStates(req, res);
      case 'get-counties':
        return handleGetCounties(req, res);
      default:
        return handleGeneratePacket(req, res);
    }
  } catch (error) {
    console.error('Traffic Ticket API Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      disclaimer: 'This service provides information only, not legal advice.'
    });
  }
}

/**
 * GET /api/generate-traffic-ticket-packet
 * Returns API information and available actions
 */
function handleGetInfo(req, res) {
  return res.status(200).json({
    service: 'Multi-State Traffic Ticket Defense Packet Generator',
    version: '2.0.0',
    description: 'Generates informational defense packets for traffic violations in TN, PA, NJ, and MS',
    disclaimer: 'INFORMATIONAL ONLY - NOT LEGAL ADVICE. Consult a licensed attorney for legal advice.',
    supportedStates: Object.keys(STATE_CONFIG).map(code => ({
      code: code.toUpperCase(),
      name: STATE_CONFIG[code].name,
      countiesAvailable: STATE_CONFIG[code].counties.length
    })),
    endpoints: {
      'POST /': {
        actions: [
          {
            action: 'generate',
            description: 'Generate complete defense packet',
            requiredFields: ['violationType', 'county', 'state'],
            optionalFields: ['citationNumber', 'violationDate', 'speed', 'speedLimit', 'location', 'officerName', 'agency', 'notes', 'isCommercialLicense', 'priorViolations']
          },
          {
            action: 'analyze',
            description: 'Analyze violation for defense options',
            requiredFields: ['violationType', 'state']
          },
          {
            action: 'get-county',
            description: 'Get county-specific court information',
            requiredFields: ['county', 'state']
          },
          {
            action: 'get-statute',
            description: 'Get statute information for violation type',
            requiredFields: ['violationType', 'state']
          },
          {
            action: 'validate',
            description: 'Validate ticket data before generation',
            requiredFields: ['ticketData']
          },
          {
            action: 'get-states',
            description: 'Get list of supported states'
          },
          {
            action: 'get-counties',
            description: 'Get list of counties for a state',
            requiredFields: ['state']
          }
        ]
      }
    },
    supportedViolations: [
      'speeding',
      'recklessDriving',
      'carelessDriving',
      'suspendedLicense',
      'noInsurance',
      'improperLaneChange',
      'failureToYield',
      'followingTooClose',
      'failureToSignal',
      'runningRedLight',
      'stopSign',
      'expiredRegistration',
      'equipmentViolation',
      'unsafeDriving'
    ],
    uplCompliance: {
      statement: 'This tool provides legal information and educational materials only.',
      notLegalAdvice: true,
      noAttorneyClientRelationship: true,
      consultAttorney: 'Always consult a licensed attorney for legal advice specific to your situation.'
    }
  });
}

/**
 * POST action: get-states
 * Get list of supported states
 */
function handleGetStates(req, res) {
  return res.status(200).json({
    success: true,
    states: Object.keys(STATE_CONFIG).map(code => ({
      code: code.toUpperCase(),
      name: STATE_CONFIG[code].name,
      countiesAvailable: STATE_CONFIG[code].counties,
      barAssociation: STATE_CONFIG[code].barAssociation,
      barPhone: STATE_CONFIG[code].barPhone
    }))
  });
}

/**
 * POST action: get-counties
 * Get list of counties for a state
 */
function handleGetCounties(req, res) {
  const data = req.body.data || req.body;
  const stateCode = normalizeState(data.state);

  if (!STATE_CONFIG[stateCode]) {
    return res.status(400).json({
      error: 'Unsupported state',
      supportedStates: Object.keys(STATE_CONFIG).map(s => s.toUpperCase())
    });
  }

  return res.status(200).json({
    success: true,
    state: stateCode.toUpperCase(),
    stateName: STATE_CONFIG[stateCode].name,
    counties: STATE_CONFIG[stateCode].counties
  });
}

/**
 * POST action: generate
 * Generate complete defense packet
 */
function handleGeneratePacket(req, res) {
  const data = req.body.data || req.body;
  const stateCode = normalizeState(data.state);

  // Validate state
  if (!STATE_CONFIG[stateCode]) {
    return res.status(400).json({
      error: 'Unsupported state',
      supportedStates: Object.keys(STATE_CONFIG).map(s => s.toUpperCase())
    });
  }

  // Validate required fields
  const validation = validateInput(data, stateCode);
  if (!validation.valid) {
    return res.status(400).json({
      error: 'Invalid input',
      details: validation.errors,
      disclaimer: 'This service provides information only, not legal advice.'
    });
  }

  // Generate the packet with state info
  const packet = packetGenerator.generateTrafficTicketPacket({
    ...data,
    state: stateCode,
    stateConfig: STATE_CONFIG[stateCode]
  });

  return res.status(200).json({
    success: true,
    state: stateCode.toUpperCase(),
    stateName: STATE_CONFIG[stateCode].name,
    disclaimer: packet.disclaimers.header.trim(),
    uplNotice: 'This packet is for informational purposes only and does not constitute legal advice.',
    data: packet
  });
}

/**
 * POST action: analyze
 * Analyze violation without generating full packet
 */
function handleAnalyzeViolation(req, res) {
  const data = req.body.data || req.body;
  const stateCode = normalizeState(data.state);

  if (!data.violationType) {
    return res.status(400).json({
      error: 'violationType is required'
    });
  }

  if (!STATE_CONFIG[stateCode]) {
    return res.status(400).json({
      error: 'Unsupported state',
      supportedStates: Object.keys(STATE_CONFIG).map(s => s.toUpperCase())
    });
  }

  const validatedData = packetGenerator.validateTicketData({ ...data, state: stateCode });
  const statutes = loadStatutes(stateCode);
  const procedures = loadProcedures(stateCode);
  const analysis = packetGenerator.analyzeViolation(validatedData, statutes, procedures);

  return res.status(200).json({
    success: true,
    state: stateCode.toUpperCase(),
    stateName: STATE_CONFIG[stateCode].name,
    disclaimer: 'This analysis is informational only and not legal advice.',
    data: {
      violationType: validatedData.violationType,
      analysis: analysis,
      points: packetGenerator.calculatePoints(validatedData.violationType, statutes, validatedData),
      defenseStrategies: packetGenerator.generateDefenseStrategies(validatedData, statutes, procedures)
    }
  });
}

/**
 * POST action: get-county
 * Get county-specific information
 */
function handleGetCountyInfo(req, res) {
  const data = req.body.data || req.body;
  const stateCode = normalizeState(data.state);

  if (!data.county) {
    return res.status(400).json({
      error: 'county is required'
    });
  }

  if (!STATE_CONFIG[stateCode]) {
    return res.status(400).json({
      error: 'Unsupported state',
      supportedStates: Object.keys(STATE_CONFIG).map(s => s.toUpperCase())
    });
  }

  const normalizedCounty = packetGenerator.normalizeCounty(data.county, stateCode);
  const countyData = packetGenerator.getCountyData(normalizedCounty, stateCode);

  return res.status(200).json({
    success: true,
    state: stateCode.toUpperCase(),
    stateName: STATE_CONFIG[stateCode].name,
    disclaimer: 'Court information may change. Verify with the court directly.',
    data: {
      county: normalizedCounty,
      ...countyData
    }
  });
}

/**
 * POST action: get-statute
 * Get statute information for violation type
 */
function handleGetStatuteInfo(req, res) {
  const data = req.body.data || req.body;
  const stateCode = normalizeState(data.state);

  if (!data.violationType) {
    return res.status(400).json({
      error: 'violationType is required'
    });
  }

  if (!STATE_CONFIG[stateCode]) {
    return res.status(400).json({
      error: 'Unsupported state',
      supportedStates: Object.keys(STATE_CONFIG).map(s => s.toUpperCase())
    });
  }

  const normalizedType = packetGenerator.normalizeViolationType(data.violationType);
  const statutes = loadStatutes(stateCode);
  const statuteInfo = statutes.statutes[normalizedType];

  if (!statuteInfo) {
    return res.status(404).json({
      error: 'Statute not found',
      violationType: normalizedType,
      availableTypes: Object.keys(statutes.statutes)
    });
  }

  return res.status(200).json({
    success: true,
    state: stateCode.toUpperCase(),
    stateName: STATE_CONFIG[stateCode].name,
    disclaimer: `Statute information may be outdated. Verify with current ${STATE_CONFIG[stateCode].statutesCode}.`,
    data: {
      violationType: normalizedType,
      statute: statuteInfo
    }
  });
}

/**
 * POST action: validate
 * Validate ticket data before generation
 */
function handleValidateData(req, res) {
  const data = req.body.data || req.body;
  const stateCode = normalizeState(data.state);

  if (!STATE_CONFIG[stateCode]) {
    return res.status(400).json({
      error: 'Unsupported state',
      supportedStates: Object.keys(STATE_CONFIG).map(s => s.toUpperCase())
    });
  }

  const validation = validateInput(data, stateCode);
  const validatedData = packetGenerator.validateTicketData({ ...data, state: stateCode });

  const warnings = [];

  if (validatedData.violationType === 'speeding') {
    if (!data.speed || !data.speedLimit) {
      warnings.push('Speed and speed limit not provided - analysis may be incomplete');
    }
  }

  if (validatedData.violationType === 'suspendedLicense' || validatedData.violationType === 'recklessDriving') {
    warnings.push('This is a criminal or serious violation - consider consulting an attorney');
  }

  // State-specific warnings
  if (stateCode === 'nj') {
    warnings.push('New Jersey requires mandatory court appearances for many violations');
  }
  if (stateCode === 'pa') {
    warnings.push('Pennsylvania does not offer traffic school on plea bargaining');
  }

  return res.status(200).json({
    success: true,
    state: stateCode.toUpperCase(),
    valid: validation.valid,
    errors: validation.errors,
    warnings: warnings,
    normalizedData: validatedData
  });
}

/**
 * Validate input data
 */
function validateInput(data, stateCode) {
  const errors = [];

  if (!data) {
    errors.push('No data provided');
    return { valid: false, errors };
  }

  if (!data.violationType) {
    errors.push('violationType is required');
  }

  if (!data.county) {
    errors.push('county is required');
  }

  // Validate violation type is supported
  if (data.violationType) {
    const normalized = packetGenerator.normalizeViolationType(data.violationType);
    const supportedTypes = [
      'speeding', 'recklessDriving', 'carelessDriving', 'suspendedLicense', 'noInsurance',
      'improperLaneChange', 'failureToYield', 'followingTooClose',
      'failureToSignal', 'runningRedLight', 'stopSign',
      'expiredRegistration', 'equipmentViolation', 'unsafeDriving'
    ];

    if (!supportedTypes.includes(normalized)) {
      errors.push(`Unsupported violation type: ${data.violationType}. Supported types: ${supportedTypes.join(', ')}`);
    }
  }

  // Validate speed data if provided
  if (data.speed !== undefined && data.speedLimit !== undefined) {
    if (data.speed <= data.speedLimit) {
      errors.push('Speed must be greater than speed limit for a speeding violation');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Load statutes data for a state
 */
function loadStatutes(stateCode) {
  try {
    const fs = require('fs');
    const path = require('path');
    const statutesPath = path.join(__dirname, `../data/traffic-ticket/${stateCode}/statutes.json`);
    if (fs.existsSync(statutesPath)) {
      return JSON.parse(fs.readFileSync(statutesPath, 'utf8'));
    }
  } catch (error) {
    console.warn(`Could not load statutes file for ${stateCode}:`, error.message);
  }

  // Return default statutes based on state
  const defaultStatutes = {
    tn: {
      statutes: {
        speeding: { code: 'TCA 55-8-152', title: 'Speed limitations', points: { '1-15_over': 1, '16-25_over': 3, '26-35_over': 4, '36+_over': 5 } },
        recklessDriving: { code: 'TCA 55-10-205', title: 'Reckless driving', classification: 'Class B Misdemeanor', points: 6 }
      }
    },
    pa: {
      statutes: {
        speeding: { code: '75 Pa.C.S. 3362', title: 'Maximum speed limits', points: { '1-5_over': 2, '6-10_over': 3, '11-15_over': 3, '16-25_over': 4, '26+_over': 5 } },
        recklessDriving: { code: '75 Pa.C.S. 3736', title: 'Reckless driving', classification: 'Summary Offense', points: 3 }
      }
    },
    nj: {
      statutes: {
        speeding: { code: 'N.J.S.A. 39:4-98', title: 'Speed regulations', points: { '1-14_over': 2, '15-29_over': 4, '30+_over': 5 } },
        recklessDriving: { code: 'N.J.S.A. 39:4-96', title: 'Reckless driving', points: 5 }
      }
    },
    ms: {
      statutes: {
        speeding: { code: 'MS Code 63-3-501', title: 'Speed limits', points: { '1-5_over': 0, '6-10_over': 2, '11-15_over': 3, '16-20_over': 4, '21-25_over': 5, '26+_over': 6 } },
        recklessDriving: { code: 'MS Code 63-3-1201', title: 'Reckless driving', classification: 'Misdemeanor', points: 6 }
      }
    }
  };

  return defaultStatutes[stateCode] || defaultStatutes.tn;
}

/**
 * Load procedures data for a state
 */
function loadProcedures(stateCode) {
  try {
    const fs = require('fs');
    const path = require('path');
    const proceduresPath = path.join(__dirname, `../data/traffic-ticket/${stateCode}/procedures.json`);
    if (fs.existsSync(proceduresPath)) {
      return JSON.parse(fs.readFileSync(proceduresPath, 'utf8'));
    }
  } catch (error) {
    console.warn(`Could not load procedures file for ${stateCode}:`, error.message);
  }

  // Return default procedures
  return {
    proceduresByViolation: {
      speeding: {
        immediateActions: ['Review ticket for accuracy', 'Document road conditions'],
        defenseStrategies: [
          {
            name: 'Calibration Challenge',
            description: 'Challenge the accuracy of speed measurement',
            steps: ['Request calibration records', 'Verify device certification']
          }
        ]
      }
    },
    generalDefenseTactics: []
  };
}

/**
 * Export handler for Vercel serverless function
 */
module.exports = handler;

// Export additional functions for testing
module.exports.handler = handler;
module.exports.handleGetInfo = handleGetInfo;
module.exports.handleGeneratePacket = handleGeneratePacket;
module.exports.handleAnalyzeViolation = handleAnalyzeViolation;
module.exports.handleGetCountyInfo = handleGetCountyInfo;
module.exports.handleGetStatuteInfo = handleGetStatuteInfo;
module.exports.handleValidateData = handleValidateData;
module.exports.handleGetStates = handleGetStates;
module.exports.handleGetCounties = handleGetCounties;
module.exports.validateInput = validateInput;
module.exports.normalizeState = normalizeState;
module.exports.STATE_CONFIG = STATE_CONFIG;
