/**
 * Multi-State Expungement Packet Generator API
 * Vercel Serverless Function
 *
 * Supports: Tennessee (TN), Pennsylvania (PA), New Jersey (NJ)
 *
 * API Endpoint: POST /api/expungement-multi-state
 *
 * UPL COMPLIANT: This API provides educational information only.
 * All responses include appropriate disclaimers.
 */

const expungementGenerator = require('../lib/expungement-packet-generator');

const DISCLAIMERS = {
  short: 'This information is for educational purposes only and does not constitute legal advice.',
  standard: 'This information is for educational purposes only and does not constitute legal advice. Consult a licensed attorney for legal guidance specific to your situation.',
  full: `IMPORTANT: This Information Packet compiles publicly available statutes, procedures, and resources.

THIS PACKET:
- Organizes publicly available information
- Provides general procedural information
- Lists relevant laws and resources

THIS PACKET DOES NOT:
- Provide legal advice
- Create an attorney-client relationship
- Substitute for consultation with a licensed attorney
- Guarantee any specific outcome

For advice specific to your circumstances, consult a licensed attorney in your jurisdiction.`
};

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

  // Only accept POST requests for most actions
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'This endpoint accepts POST and GET requests'
    });
  }

  try {
    const { action, data } = req.method === 'POST' ? req.body : { action: req.query.action, data: req.query };

    switch (action) {
      case 'analyze':
        return handleAnalyze(req, res, data);
      case 'generate-packet':
        return handleGeneratePacket(req, res, data);
      case 'get-county-info':
        return handleGetCountyInfo(req, res, data);
      case 'check-eligibility':
        return handleCheckEligibility(req, res, data);
      case 'list-states':
        return handleListStates(req, res);
      case 'list-counties':
        return handleListCounties(req, res, data);
      case 'get-statutes':
        return handleGetStatutes(req, res, data);
      case 'get-procedures':
        return handleGetProcedures(req, res, data);
      case 'clean-slate-info':
        return handleCleanSlateInfo(req, res, data);
      default:
        return res.status(400).json({
          error: 'Invalid action',
          message: 'Supported actions: analyze, generate-packet, get-county-info, check-eligibility, list-states, list-counties, get-statutes, get-procedures, clean-slate-info',
          disclaimer: DISCLAIMERS.short
        });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      disclaimer: DISCLAIMERS.short
    });
  }
}

/**
 * Handle eligibility analysis
 */
function handleAnalyze(req, res, data) {
  if (!data || !data.state) {
    return res.status(400).json({
      error: 'Missing data',
      message: 'State is required for analysis',
      supportedStates: expungementGenerator.getSupportedStates(),
      disclaimer: DISCLAIMERS.short
    });
  }

  const state = data.state.toUpperCase();

  // Validate state is supported
  const supportedStates = expungementGenerator.getSupportedStates();
  if (!supportedStates.find(s => s.code === state)) {
    return res.status(400).json({
      error: 'Unsupported state',
      message: `State '${state}' is not currently supported`,
      supportedStates: supportedStates,
      disclaimer: DISCLAIMERS.short
    });
  }

  // Validate required fields
  if (!data.chargeType && !data.chargeDescription && !data.outcome) {
    return res.status(400).json({
      error: 'Insufficient data',
      message: 'Please provide charge type or charge description and outcome',
      disclaimer: DISCLAIMERS.short
    });
  }

  // Perform analysis
  const analysis = expungementGenerator.analyzeEligibility(state, data);

  return res.status(200).json({
    success: true,
    disclaimer: DISCLAIMERS.standard,
    data: {
      analysis: analysis,
      summary: generateAnalysisSummary(analysis)
    }
  });
}

/**
 * Handle packet generation
 */
function handleGeneratePacket(req, res, data) {
  if (!data || !data.state) {
    return res.status(400).json({
      error: 'Missing data',
      message: 'State is required for packet generation',
      disclaimer: DISCLAIMERS.short
    });
  }

  if (!data.situation) {
    return res.status(400).json({
      error: 'Missing data',
      message: 'Situation data is required for packet generation',
      disclaimer: DISCLAIMERS.short
    });
  }

  const state = data.state.toUpperCase();
  const format = data.format || 'json';
  const county = data.county || null;

  // Validate state
  const supportedStates = expungementGenerator.getSupportedStates();
  if (!supportedStates.find(s => s.code === state)) {
    return res.status(400).json({
      error: 'Unsupported state',
      message: `State '${state}' is not currently supported`,
      supportedStates: supportedStates,
      disclaimer: DISCLAIMERS.short
    });
  }

  if (format === 'text') {
    const textPacket = expungementGenerator.generateTextPacket({
      state: state,
      situation: data.situation,
      county: county,
      format: 'text'
    });

    res.setHeader('Content-Type', 'text/plain');
    return res.status(200).send(textPacket);
  }

  // Generate JSON packet
  const packet = expungementGenerator.generatePacket({
    state: state,
    situation: data.situation,
    county: county,
    format: 'json'
  });

  return res.status(200).json({
    success: true,
    disclaimer: DISCLAIMERS.full,
    data: packet
  });
}

/**
 * Handle county information request
 */
function handleGetCountyInfo(req, res, data) {
  if (!data || !data.state || !data.county) {
    return res.status(400).json({
      error: 'Missing data',
      message: 'State and county name are required',
      disclaimer: DISCLAIMERS.short
    });
  }

  const state = data.state.toUpperCase();
  const county = data.county.toLowerCase();

  const countyData = expungementGenerator.loadCountyData(state, county);

  if (!countyData) {
    const availableCounties = expungementGenerator.listCounties(state);
    return res.status(404).json({
      error: 'County not found',
      message: `County '${data.county}' is not currently supported for ${state}`,
      availableCounties: availableCounties,
      disclaimer: DISCLAIMERS.short
    });
  }

  return res.status(200).json({
    success: true,
    disclaimer: DISCLAIMERS.standard,
    data: countyData
  });
}

/**
 * Handle quick eligibility check
 */
function handleCheckEligibility(req, res, data) {
  if (!data || !data.state) {
    return res.status(400).json({
      error: 'Missing data',
      message: 'State is required',
      disclaimer: DISCLAIMERS.short
    });
  }

  const state = data.state.toUpperCase();

  // Minimal validation for quick check
  if (!data.chargeType && !data.chargeDescription && !data.outcome) {
    return res.status(400).json({
      error: 'Insufficient data',
      message: 'Please provide charge type or charge description and outcome',
      disclaimer: DISCLAIMERS.short
    });
  }

  // Perform analysis
  const analysis = expungementGenerator.analyzeEligibility(state, data);

  // Return simplified eligibility response
  return res.status(200).json({
    success: true,
    disclaimer: DISCLAIMERS.standard,
    data: {
      state: state,
      stateName: analysis.stateName,
      eligibility: {
        status: analysis.eligibility.status,
        confidence: analysis.eligibility.confidence,
        waitingPeriod: analysis.eligibility.waitingPeriod,
        waitingPeriodMet: analysis.eligibility.waitingPeriodMet,
        reasons: analysis.eligibility.reasons,
        blockingFactors: analysis.eligibility.blockingFactors
      },
      cleanSlate: {
        available: analysis.cleanSlate.available,
        eligible: analysis.cleanSlate.eligible,
        timeline: analysis.cleanSlate.estimatedTimeline
      },
      nextSteps: analysis.nextSteps.slice(0, 3),
      recommendation: getQuickRecommendation(analysis)
    }
  });
}

/**
 * Handle list states request
 */
function handleListStates(req, res) {
  const states = expungementGenerator.getSupportedStates();

  return res.status(200).json({
    success: true,
    disclaimer: DISCLAIMERS.short,
    data: {
      states: states,
      total: states.length,
      cleanSlateStates: states.filter(s => s.cleanSlate).map(s => s.code)
    }
  });
}

/**
 * Handle list counties request
 */
function handleListCounties(req, res, data) {
  if (!data || !data.state) {
    return res.status(400).json({
      error: 'Missing data',
      message: 'State is required',
      supportedStates: expungementGenerator.getSupportedStates(),
      disclaimer: DISCLAIMERS.short
    });
  }

  const state = data.state.toUpperCase();
  const counties = expungementGenerator.listCounties(state);

  return res.status(200).json({
    success: true,
    disclaimer: DISCLAIMERS.short,
    data: {
      state: state,
      counties: counties,
      total: counties.length,
      note: counties.length === 0
        ? `No county data available for ${state}. Contact local courts for information.`
        : `More counties will be added in future updates.`
    }
  });
}

/**
 * Handle get statutes request
 */
function handleGetStatutes(req, res, data) {
  if (!data || !data.state) {
    return res.status(400).json({
      error: 'Missing data',
      message: 'State is required',
      disclaimer: DISCLAIMERS.short
    });
  }

  const state = data.state.toUpperCase();
  const statutes = expungementGenerator.loadStatutes(state);

  if (!statutes) {
    return res.status(404).json({
      error: 'Statutes not found',
      message: `Statute data not available for ${state}`,
      disclaimer: DISCLAIMERS.short
    });
  }

  return res.status(200).json({
    success: true,
    disclaimer: DISCLAIMERS.standard,
    data: statutes
  });
}

/**
 * Handle get procedures request
 */
function handleGetProcedures(req, res, data) {
  if (!data || !data.state) {
    return res.status(400).json({
      error: 'Missing data',
      message: 'State is required',
      disclaimer: DISCLAIMERS.short
    });
  }

  const state = data.state.toUpperCase();
  const procedures = expungementGenerator.loadProcedures(state);

  if (!procedures) {
    return res.status(404).json({
      error: 'Procedures not found',
      message: `Procedure data not available for ${state}`,
      disclaimer: DISCLAIMERS.short
    });
  }

  return res.status(200).json({
    success: true,
    disclaimer: DISCLAIMERS.standard,
    data: procedures
  });
}

/**
 * Handle Clean Slate information request
 */
function handleCleanSlateInfo(req, res, data) {
  const states = expungementGenerator.getSupportedStates();
  const cleanSlateStates = states.filter(s => s.cleanSlate);

  const cleanSlateData = cleanSlateStates.map(state => {
    const statutes = expungementGenerator.loadStatutes(state.code);
    return {
      state: state.code,
      name: state.name,
      cleanSlateInfo: statutes?.cleanSlate || null,
      highlights: statutes?.cleanSlateHighlights || []
    };
  });

  return res.status(200).json({
    success: true,
    disclaimer: DISCLAIMERS.standard,
    data: {
      title: 'Clean Slate Laws - Automatic Record Sealing/Expungement',
      description: 'Clean Slate laws provide automatic sealing or expungement of eligible criminal records without requiring individuals to file a petition.',
      states: cleanSlateData,
      keyPoints: [
        'Clean Slate is FREE - no filing or administrative fees',
        'Process is automatic - no lawyer or paperwork required',
        'Applies to eligible non-conviction and conviction records',
        'Waiting periods vary by state and offense type',
        'Records remain accessible to law enforcement for certain purposes'
      ]
    }
  });
}

/**
 * Generate a summary of the analysis
 */
function generateAnalysisSummary(analysis) {
  const summary = {
    state: analysis.state,
    stateName: analysis.stateName,
    status: analysis.eligibility.status,
    confidence: analysis.eligibility.confidence,
    canProceedNow: false,
    cleanSlateEligible: analysis.cleanSlate?.eligible || false,
    petitionEligible: analysis.petitionBased?.eligible || false,
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
  summary.topActions = analysis.nextSteps.slice(0, 3);

  return summary;
}

/**
 * Get a quick recommendation based on analysis
 */
function getQuickRecommendation(analysis) {
  if (analysis.eligibility.status === 'eligible') {
    if (analysis.cleanSlate?.eligible) {
      return 'You may be eligible for automatic Clean Slate sealing/expungement. Verify your status with the state police or court records. No petition required for automatic processing.';
    }
    return 'You may be eligible for expungement. Obtain your criminal records and consult with an attorney or the court clerk to verify eligibility before filing.';
  }

  if (analysis.eligibility.status === 'ineligible') {
    if (analysis.eligibility.blockingFactors.length > 0) {
      return `Based on the information provided, you may not be eligible for expungement due to: ${analysis.eligibility.blockingFactors[0].description}. Consult with an attorney to discuss your options.`;
    }
    return 'Based on the information provided, you may not be eligible for expungement. Consult with an attorney to review your specific case.';
  }

  if (analysis.eligibility.status === 'pending') {
    return 'Additional requirements must be completed before you can file for expungement. Review the waiting period and requirements in your packet.';
  }

  return 'More information is needed to determine eligibility. Obtain your complete criminal records and consult with an attorney.';
}

/**
 * GET handler for API documentation
 */
function getApiDocumentation() {
  return {
    endpoint: '/api/expungement-multi-state',
    method: 'POST',
    contentType: 'application/json',
    supportedStates: expungementGenerator.getSupportedStates(),
    actions: [
      {
        action: 'analyze',
        description: 'Analyze eligibility for expungement',
        requiredData: ['state', 'chargeType or chargeDescription', 'outcome'],
        optionalData: ['county', 'convictionDate', 'sentenceCompletionDate', 'allFinesPaid', 'probationCompleted', 'diversionCompleted', 'hasPendingCharges']
      },
      {
        action: 'generate-packet',
        description: 'Generate a complete expungement information packet',
        requiredData: ['state', 'situation object with charge and outcome info'],
        optionalData: ['county', 'format (json|text)']
      },
      {
        action: 'get-county-info',
        description: 'Get county-specific court and filing information',
        requiredData: ['state', 'county name']
      },
      {
        action: 'check-eligibility',
        description: 'Quick eligibility check',
        requiredData: ['state', 'chargeType or chargeDescription', 'outcome']
      },
      {
        action: 'list-states',
        description: 'List supported states',
        requiredData: []
      },
      {
        action: 'list-counties',
        description: 'List supported counties for a state',
        requiredData: ['state']
      },
      {
        action: 'get-statutes',
        description: 'Get state-specific expungement statutes',
        requiredData: ['state']
      },
      {
        action: 'get-procedures',
        description: 'Get state-specific expungement procedures',
        requiredData: ['state']
      },
      {
        action: 'clean-slate-info',
        description: 'Get information about Clean Slate automatic expungement laws',
        requiredData: []
      }
    ],
    disclaimer: DISCLAIMERS.standard
  };
}

/**
 * Export for Vercel serverless function
 */
module.exports = handler;
module.exports.getApiDocumentation = getApiDocumentation;
