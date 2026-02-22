/**
 * Situation Analyzer for Tennessee Expungement
 * Analyzes user input to determine expungement eligibility and provide guidance
 *
 * UPL COMPLIANT: This analyzer provides information only, not legal advice.
 * All outputs include appropriate disclaimers.
 */

// Load statutes data
const statutes = require('../data/expungement/tn/statutes.json');
const procedures = require('../data/expungement/tn/procedures.json');

/**
 * Analyze a user's situation for expungement eligibility
 * @param {object} situation - User's situation data
 * @returns {object} Analysis results
 */
function analyzeSituation(situation) {
  const analysis = {
    timestamp: new Date().toISOString(),
    input: sanitizeInput(situation),
    eligibility: null,
    procedure: null,
    warnings: [],
    recommendations: [],
    nextSteps: [],
    timeline: null,
    fees: null
  };

  // Determine charge category and outcome
  const chargeType = determineChargeType(situation);
  const outcome = determineOutcome(situation);

  // Assess eligibility
  analysis.eligibility = assessEligibility(situation, chargeType, outcome);

  // Determine applicable procedure
  analysis.procedure = determineProcedure(outcome, chargeType);

  // Generate warnings based on input
  analysis.warnings = generateWarnings(situation, analysis.eligibility);

  // Generate recommendations
  analysis.recommendations = generateRecommendations(situation, analysis.eligibility);

  // Generate next steps
  analysis.nextSteps = generateNextSteps(situation, analysis.eligibility, analysis.procedure);

  // Estimate timeline
  analysis.timeline = estimateTimeline(situation, analysis.eligibility, analysis.procedure);

  // Fee information
  analysis.fees = getFeeInformation();

  return analysis;
}

/**
 * Sanitize and validate input
 */
function sanitizeInput(situation) {
  return {
    chargeType: situation.chargeType || 'unknown',
    chargeDescription: situation.chargeDescription || 'Not provided',
    convictionDate: situation.convictionDate || null,
    sentenceCompletionDate: situation.sentenceCompletionDate || null,
    outcome: situation.outcome || 'unknown',
    county: situation.county || 'unknown',
    allFinesPaid: situation.allFinesPaid || false,
    probationCompleted: situation.probationCompleted || false,
    diversionCompleted: situation.diversionCompleted || false,
    hasPendingCharges: situation.hasPendingCharges || false,
    priorExpungements: situation.priorExpungements || 0
  };
}

/**
 * Determine the type of charge (misdemeanor/felony)
 */
function determineChargeType(situation) {
  const type = (situation.chargeType || '').toLowerCase();

  if (type.includes('felony') || type.includes('class e') || type.includes('class d')) {
    return {
      category: 'felony',
      class: extractFelonyClass(type),
      description: 'Felony'
    };
  }

  if (type.includes('misdemeanor') || type.includes('class a') || type.includes('class b') || type.includes('class c')) {
    return {
      category: 'misdemeanor',
      class: extractMisdemeanorClass(type),
      description: 'Misdemeanor'
    };
  }

  return {
    category: 'unknown',
    class: 'unknown',
    description: 'Unknown - Verification Required'
  };
}

/**
 * Extract felony class from string
 */
function extractFelonyClass(type) {
  if (type.includes('class a') && type.includes('felony')) return 'Class A';
  if (type.includes('class b') && type.includes('felony')) return 'Class B';
  if (type.includes('class c') && type.includes('felony')) return 'Class C';
  if (type.includes('class d') && type.includes('felony')) return 'Class D';
  if (type.includes('class e') || type.includes('classe')) return 'Class E';
  return 'Unknown';
}

/**
 * Extract misdemeanor class from string
 */
function extractMisdemeanorClass(type) {
  if (type.includes('class a') && !type.includes('felony')) return 'Class A';
  if (type.includes('class b') && !type.includes('felony')) return 'Class B';
  if (type.includes('class c') && !type.includes('felony')) return 'Class C';
  return 'Unknown';
}

/**
 * Determine the outcome of the case
 */
function determineOutcome(situation) {
  const outcome = (situation.outcome || '').toLowerCase();

  if (outcome.includes('dismiss') || outcome.includes('dropped')) {
    return 'dismissed';
  }
  if (outcome.includes('acquitt') || outcome.includes('not guilty') || outcome.includes('found not guilty')) {
    return 'acquitted';
  }
  if (outcome.includes('diversion') || outcome.includes('deferred')) {
    if (situation.diversionCompleted) {
      return 'diversion_completed';
    }
    return 'diversion_pending';
  }
  if (outcome.includes('convict') || outcome.includes('guilty') || outcome.includes('plea')) {
    return 'convicted';
  }

  return 'unknown';
}

/**
 * Assess eligibility based on Tennessee law
 */
function assessEligibility(situation, chargeType, outcome) {
  const eligibility = {
    status: 'unknown',
    confidence: 'low',
    reasons: [],
    blockingFactors: [],
    waitingPeriod: null,
    waitingPeriodMet: false,
    requirements: []
  };

  // Check for pending charges (blocking factor)
  if (situation.hasPendingCharges) {
    eligibility.status = 'ineligible';
    eligibility.blockingFactors.push({
      factor: 'Pending criminal charges',
      severity: 'blocking',
      description: 'You cannot file for expungement while you have pending criminal charges'
    });
    return eligibility;
  }

  // Handle dismissed/acquitted cases
  if (outcome === 'dismissed' || outcome === 'acquitted') {
    eligibility.status = 'eligible';
    eligibility.confidence = 'high';
    eligibility.waitingPeriod = 'None';
    eligibility.waitingPeriodMet = true;
    eligibility.reasons.push('Charges were dismissed or resulted in acquittal');
    eligibility.requirements.push('Obtain certified copy of dismissal or acquittal order');
    return eligibility;
  }

  // Handle completed diversion
  if (outcome === 'diversion_completed') {
    eligibility.status = 'eligible';
    eligibility.confidence = 'high';
    eligibility.waitingPeriod = 'None (after completion)';
    eligibility.waitingPeriodMet = true;
    eligibility.reasons.push('Diversion program was successfully completed');
    eligibility.requirements.push('Obtain Certificate of Completion from diversion program');
    return eligibility;
  }

  // Handle pending diversion
  if (outcome === 'diversion_pending') {
    eligibility.status = 'pending';
    eligibility.confidence = 'medium';
    eligibility.reasons.push('Diversion program not yet completed');
    eligibility.requirements.push('Complete all diversion requirements');
    return eligibility;
  }

  // Handle convictions
  if (outcome === 'convicted') {
    // Check for ineligible offenses
    const ineligibilityCheck = checkIneligibleOffenses(situation, chargeType);
    if (ineligibilityCheck.ineligible) {
      eligibility.status = 'ineligible';
      eligibility.confidence = 'high';
      eligibility.blockingFactors.push(ineligibilityCheck.reason);
      return eligibility;
    }

    // Check waiting period
    const waitingPeriodCheck = checkWaitingPeriod(situation, chargeType);
    eligibility.waitingPeriod = waitingPeriodCheck.required;
    eligibility.waitingPeriodMet = waitingPeriodCheck.met;

    // Check court obligations
    const obligationsCheck = checkCourtObligations(situation);

    if (!eligibility.waitingPeriodMet) {
      eligibility.status = 'pending';
      eligibility.confidence = 'medium';
      eligibility.reasons.push(`Waiting period of ${waitingPeriodCheck.required} not yet completed`);
      eligibility.requirements.push(`Wait until ${waitingPeriodCheck.required} have passed since sentence completion`);
    } else if (!obligationsCheck.met) {
      eligibility.status = 'ineligible';
      eligibility.confidence = 'medium';
      eligibility.blockingFactors.push({
        factor: 'Outstanding court obligations',
        severity: 'blocking',
        description: 'All fines, costs, and restitution must be paid before expungement'
      });
    } else {
      eligibility.status = 'eligible';
      eligibility.confidence = 'medium';
      eligibility.reasons.push('Basic eligibility requirements appear to be met');
      eligibility.requirements.push('Verify eligibility with court clerk or attorney');
    }

    return eligibility;
  }

  // Unknown outcome
  eligibility.status = 'unknown';
  eligibility.confidence = 'low';
  eligibility.requirements.push('Obtain records to determine case outcome');
  return eligibility;
}

/**
 * Check if offense is on ineligible list
 */
function checkIneligibleOffenses(situation, chargeType) {
  const description = (situation.chargeDescription || '').toLowerCase();
  const ineligible = statutes.ineligibleOffenses;

  // Check for DUI
  if (description.includes('dui') || description.includes('driving under') || description.includes('d.u.i')) {
    return {
      ineligible: true,
      reason: {
        factor: 'DUI conviction',
        severity: 'blocking',
        description: 'DUI convictions are not eligible for expungement in Tennessee',
        statute: 'TCA 40-32-101(g)'
      }
    };
  }

  // Check for domestic assault
  if (description.includes('domestic') && (description.includes('assault') || description.includes('violence'))) {
    return {
      ineligible: true,
      reason: {
        factor: 'Domestic assault conviction',
        severity: 'blocking',
        description: 'Domestic assault convictions are not eligible for expungement in Tennessee',
        statute: 'TCA 40-32-101(g)'
      }
    };
  }

  // Check for sex offenses
  if (description.includes('sex') || description.includes('rape') || description.includes('sexual') || description.includes('statutory')) {
    return {
      ineligible: true,
      reason: {
        factor: 'Sex offense',
        severity: 'blocking',
        description: 'Sex offenses are not eligible for expungement in Tennessee',
        statute: 'TCA 40-32-101'
      }
    };
  }

  // Check for violent felonies
  if (chargeType.category === 'felony') {
    const violentIndicators = ['murder', 'manslaughter', 'kidnap', 'robbery', 'arson', 'homicide', 'weapon', 'firearm', 'gun'];
    for (const indicator of violentIndicators) {
      if (description.includes(indicator)) {
        return {
          ineligible: true,
          reason: {
            factor: 'Violent felony',
            severity: 'blocking',
            description: 'Violent felonies are not eligible for expungement in Tennessee',
            statute: 'TCA 40-32-101(a)(1)(B)'
          }
        };
      }
    }
  }

  // Check for drug trafficking
  if (description.includes('traffick') || description.includes('manufacture') || description.includes('distribute') || description.includes('sell')) {
    return {
      ineligible: true,
      reason: {
        factor: 'Drug trafficking/manufacturing',
        severity: 'blocking',
        description: 'Drug trafficking and manufacturing offenses are not eligible for expungement in Tennessee',
        statute: 'TCA 40-32-101'
      }
    };
  }

  return { ineligible: false };
}

/**
 * Check if waiting period has been met
 */
function checkWaitingPeriod(situation, chargeType) {
  const completionDate = situation.sentenceCompletionDate ? new Date(situation.sentenceCompletionDate) : null;

  if (!completionDate) {
    return {
      required: chargeType.category === 'felony' ? '5 years' : '1 year',
      met: false,
      note: 'Sentence completion date not provided'
    };
  }

  const now = new Date();
  const yearsSinceCompletion = (now - completionDate) / (1000 * 60 * 60 * 24 * 365);

  if (chargeType.category === 'felony') {
    return {
      required: '5 years',
      met: yearsSinceCompletion >= 5,
      yearsRemaining: Math.max(0, 5 - yearsSinceCompletion).toFixed(1)
    };
  } else {
    return {
      required: '1 year',
      met: yearsSinceCompletion >= 1,
      yearsRemaining: Math.max(0, 1 - yearsSinceCompletion).toFixed(1)
    };
  }
}

/**
 * Check if court obligations are satisfied
 */
function checkCourtObligations(situation) {
  const finesPaid = situation.allFinesPaid;
  const probationDone = situation.probationCompleted;

  if (!finesPaid || !probationDone) {
    return {
      met: false,
      issues: [
        !finesPaid ? 'Outstanding fines or court costs' : null,
        !probationDone ? 'Probation not completed' : null
      ].filter(Boolean)
    };
  }

  return { met: true };
}

/**
 * Determine the applicable procedure based on outcome
 */
function determineProcedure(outcome, chargeType) {
  const proceduresMap = {
    'dismissed': 'dismissedCharges',
    'acquitted': 'dismissedCharges',
    'diversion_completed': chargeType.category === 'felony' ? 'judicialDiversion' : 'judicialDiversion',
    'convicted': chargeType.category === 'felony' ? 'felonyConviction' : 'misdemeanorConviction'
  };

  const procedureKey = proceduresMap[outcome] || 'general';
  return procedures.procedures[procedureKey] || null;
}

/**
 * Generate warnings based on analysis
 */
function generateWarnings(situation, eligibility) {
  const warnings = [];

  if (eligibility.status === 'ineligible') {
    warnings.push({
      type: 'ineligibility',
      severity: 'high',
      message: 'Based on the information provided, you may not be eligible for expungement',
      detail: 'Please consult with an attorney to discuss your options'
    });
  }

  if (eligibility.status === 'pending') {
    warnings.push({
      type: 'pending',
      severity: 'medium',
      message: 'Additional time or requirements must be completed before you can file',
      detail: 'Review the requirements section for details'
    });
  }

  if (eligibility.confidence === 'low') {
    warnings.push({
      type: 'uncertainty',
      severity: 'medium',
      message: 'More information is needed to accurately assess your eligibility',
      detail: 'Obtain your complete criminal records and consult with an attorney'
    });
  }

  if (situation.priorExpungements > 0) {
    warnings.push({
      type: 'prior_expungement',
      severity: 'medium',
      message: 'You have indicated prior expungements',
      detail: 'Tennessee limits the frequency of expungements. Consult with an attorney'
    });
  }

  return warnings;
}

/**
 * Generate recommendations
 */
function generateRecommendations(situation, eligibility) {
  const recommendations = [];

  // Always recommend getting records
  recommendations.push({
    priority: 'high',
    action: 'Obtain complete criminal records',
    detail: 'Contact the court clerk where your case was heard to get certified copies'
  });

  // Always recommend attorney consultation
  recommendations.push({
    priority: 'high',
    action: 'Consult with a licensed Tennessee attorney',
    detail: 'An attorney can review your specific case and provide personalized advice'
  });

  if (eligibility.status === 'eligible') {
    recommendations.push({
      priority: 'medium',
      action: 'Verify eligibility with the court clerk',
      detail: 'Court clerks can confirm your eligibility before you file'
    });

    recommendations.push({
      priority: 'medium',
      action: 'Gather all required documentation',
      detail: 'Include proof of sentence completion and payment of all fines'
    });
  }

  if (!situation.allFinesPaid) {
    recommendations.push({
      priority: 'high',
      action: 'Pay all outstanding fines and court costs',
      detail: 'All court obligations must be satisfied before expungement'
    });
  }

  return recommendations;
}

/**
 * Generate next steps based on eligibility
 */
function generateNextSteps(situation, eligibility, procedure) {
  const steps = [];

  if (procedure && procedure.process) {
    procedure.process.forEach((step, index) => {
      steps.push({
        step: index + 1,
        action: step,
        status: 'pending'
      });
    });
  } else {
    // Generic steps
    steps.push({ step: 1, action: 'Obtain certified copies of your criminal records', status: 'pending' });
    steps.push({ step: 2, action: 'Consult with an attorney about your eligibility', status: 'pending' });
    steps.push({ step: 3, action: 'Complete Petition for Expungement forms', status: 'pending' });
    steps.push({ step: 4, action: 'File petition with the court clerk', status: 'pending' });
    steps.push({ step: 5, action: 'Attend hearing if required', status: 'pending' });
  }

  return steps;
}

/**
 * Estimate timeline for expungement
 */
function estimateTimeline(situation, eligibility, procedure) {
  if (!eligibility.waitingPeriodMet && eligibility.waitingPeriod) {
    return {
      waitingPeriod: eligibility.waitingPeriod,
      processingTime: '30-90 days after filing',
      totalEstimate: `${eligibility.waitingPeriod} waiting period + 30-90 days processing`,
      note: 'Waiting period must be completed before filing'
    };
  }

  if (procedure && procedure.timeline) {
    return {
      waitingPeriod: 'None',
      processingTime: procedure.timeline,
      totalEstimate: procedure.timeline,
      note: 'Timeline may vary based on court backlog and whether DA objects'
    };
  }

  return {
    waitingPeriod: 'Unknown',
    processingTime: '30-90 days typical',
    totalEstimate: '30-90 days',
    note: 'Timeline varies by county and case complexity'
  };
}

/**
 * Get fee information
 */
function getFeeInformation() {
  return {
    stateFee: statutes.fees.baseFee,
    administrativeFees: statutes.fees.administrativeFees,
    notes: 'Fees may vary by county. Contact the court clerk to verify current fees.'
  };
}

module.exports = {
  analyzeSituation,
  determineChargeType,
  determineOutcome,
  assessEligibility,
  checkIneligibleOffenses,
  checkWaitingPeriod,
  checkCourtObligations,
  determineProcedure,
  generateWarnings,
  generateRecommendations,
  generateNextSteps,
  estimateTimeline,
  getFeeInformation
};
