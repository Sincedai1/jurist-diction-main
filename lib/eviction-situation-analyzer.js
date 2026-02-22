/**
 * Situation Analyzer for Tennessee Eviction Defense
 * Analyzes tenant's situation to identify applicable defenses and next steps
 *
 * UPL COMPLIANT: This analyzer provides information only, not legal advice.
 */

// Load data files
const statutesData = require('../data/eviction-defense/tn/statutes.json');
const proceduresData = require('../data/eviction-defense/tn/procedures.json');

/**
 * Analyze eviction situation and determine type and applicable defenses
 * @param {object} situationData - Tenant's situation data
 * @returns {object} Analysis results with defenses and recommendations
 */
function analyzeSituation(situationData) {
  const analysis = {
    timestamp: new Date().toISOString(),
    evictionType: determineEvictionType(situationData),
    timelineAnalysis: analyzeTimeline(situationData),
    defenses: [],
    recommendedDefenses: [],
    nextSteps: [],
    urgencyLevel: 'standard',
    county: situationData.county || 'unknown',
    missingInformation: [],
    resources: []
  };

  // Determine applicable defenses based on eviction type
  analysis.defenses = identifyDefenses(situationData, analysis.evictionType);
  analysis.recommendedDefenses = prioritizeDefenses(analysis.defenses);
  analysis.nextSteps = generateNextSteps(situationData, analysis);
  analysis.urgencyLevel = determineUrgency(situationData);

  // Add county-specific resources
  analysis.resources = getCountyResources(situationData.county);

  return analysis;
}

/**
 * Determine the type of eviction from situation data
 * @param {object} data - Situation data
 * @returns {object} Eviction type information
 */
function determineEvictionType(data) {
  const reasons = data.evictionReason || '';
  const lowerReasons = reasons.toLowerCase();

  // Check for specific eviction types
  if (lowerReasons.includes('non-payment') ||
      lowerReasons.includes('nonpayment') ||
      lowerReasons.includes('rent') ||
      lowerReasons.includes('unpaid') ||
      lowerReasons.includes('behind on rent')) {
    return {
      type: 'nonpayment',
      displayName: 'Non-Payment of Rent',
      noticeRequired: 14,
      description: 'Landlord claims tenant has not paid rent as required by lease',
      procedures: proceduresData.defenseStrategies.nonpayment
    };
  }

  if (lowerReasons.includes('lease violation') ||
      lowerReasons.includes('violation') ||
      lowerReasons.includes('breach') ||
      lowerReasons.includes('unauthorized') ||
      lowerReasons.includes('pet') ||
      lowerReasons.includes('guest')) {
    return {
      type: 'leaseViolation',
      displayName: 'Lease Violation',
      noticeRequired: 30,
      description: 'Landlord claims tenant violated terms of lease agreement',
      procedures: proceduresData.defenseStrategies.leaseViolation
    };
  }

  if (lowerReasons.includes('holdover') ||
      lowerReasons.includes('expired') ||
      lowerReasons.includes('end of lease') ||
      lowerReasons.includes('staying after') ||
      lowerReasons.includes('month to month')) {
    return {
      type: 'holdover',
      displayName: 'Holdover Tenant',
      noticeRequired: 30,
      description: 'Landlord claims tenant remained after lease ended',
      procedures: proceduresData.defenseStrategies.holdover
    };
  }

  if (lowerReasons.includes('criminal') ||
      lowerReasons.includes('illegal') ||
      lowerReasons.includes('drug') ||
      lowerReasons.includes('crime') ||
      lowerReasons.includes('nuisance')) {
    return {
      type: 'illegalActivity',
      displayName: 'Criminal/Illegal Activity',
      noticeRequired: 3,
      description: 'Landlord claims criminal or illegal activity occurred on premises',
      procedures: proceduresData.defenseStrategies.illegalActivity
    };
  }

  // Default to non-payment if unclear
  return {
    type: 'nonpayment',
    displayName: 'Non-Payment of Rent (Assumed)',
    noticeRequired: 14,
    description: 'Based on information provided, appears to be non-payment eviction',
    procedures: proceduresData.defenseStrategies.nonpayment
  };
}

/**
 * Analyze timeline compliance
 * @param {object} data - Situation data
 * @returns {object} Timeline analysis
 */
function analyzeTimeline(data) {
  const analysis = {
    noticeGiven: data.noticeReceived === true || data.noticeReceived === 'true',
    noticeDate: data.noticeDate || null,
    noticeType: data.noticeType || 'unknown',
    courtDate: data.courtDate || null,
    filingDate: data.filingDate || null,
    issues: [],
    compliant: true,
    calculationDetails: {}
  };

  // Determine eviction type for notice requirements
  const evictionType = determineEvictionType(data);

  // Check if proper notice period was given
  if (analysis.noticeDate && analysis.filingDate) {
    const noticeDate = new Date(analysis.noticeDate);
    const filingDate = new Date(analysis.filingDate);
    const daysBetween = Math.floor((filingDate - noticeDate) / (1000 * 60 * 60 * 24));

    analysis.calculationDetails.daysBetweenNoticeAndFiling = daysBetween;
    analysis.calculationDetails.requiredDays = evictionType.noticeRequired;
    analysis.calculationDetails.noticeDate = analysis.noticeDate;
    analysis.calculationDetails.filingDate = analysis.filingDate;

    if (daysBetween < evictionType.noticeRequired) {
      analysis.issues.push({
        type: 'insufficient_notice',
        message: `Notice period may be insufficient. ${evictionType.noticeRequired} days required, but only ${daysBetween} days given before filing.`,
        defense: 'improper_notice',
        severity: 'high',
        details: `Notice served: ${analysis.noticeDate}, Detainer filed: ${analysis.filingDate}`
      });
      analysis.compliant = false;
    }
  }

  // Check for upcoming deadlines
  if (analysis.courtDate) {
    const courtDate = new Date(analysis.courtDate);
    const today = new Date();
    const daysUntilCourt = Math.ceil((courtDate - today) / (1000 * 60 * 60 * 24));

    analysis.calculationDetails.daysUntilCourt = daysUntilCourt;
    analysis.calculationDetails.courtDate = analysis.courtDate;

    if (daysUntilCourt <= 0) {
      analysis.issues.push({
        type: 'past_court_date',
        message: `The court date ${analysis.courtDate} has passed.`,
        severity: 'critical'
      });
    } else if (daysUntilCourt <= 3) {
      analysis.issues.push({
        type: 'urgent_court_date',
        message: `Court date is very soon (${daysUntilCourt} days). Immediate action required.`,
        severity: 'critical'
      });
    } else if (daysUntilCourt <= 7) {
      analysis.issues.push({
        type: 'upcoming_court_date',
        message: `Court date is approaching (${daysUntilCourt} days). Prepare now.`,
        severity: 'high'
      });
    }
  }

  // Check if judgment received (10-day appeal window)
  if (data.judgmentReceived === true || data.judgmentReceived === 'true') {
    const judgmentDate = data.judgmentDate ? new Date(data.judgmentDate) : new Date();
    const today = new Date();
    const daysSinceJudgment = Math.floor((today - judgmentDate) / (1000 * 60 * 60 * 24));
    const daysLeftToAppeal = Math.max(0, 10 - daysSinceJudgment);

    analysis.calculationDetails.daysSinceJudgment = daysSinceJudgment;
    analysis.calculationDetails.daysLeftToAppeal = daysLeftToAppeal;

    if (daysLeftToAppeal > 0) {
      analysis.issues.push({
        type: 'appeal_deadline',
        message: `You have ${daysLeftToAppeal} days left to file an appeal.`,
        severity: 'critical',
        deadline: `${daysLeftToAppeal} days`
      });
    } else {
      analysis.issues.push({
        type: 'appeal_deadline_passed',
        message: `The 10-day appeal window has passed.`,
        severity: 'critical'
      });
    }
  }

  return analysis;
}

/**
 * Identify applicable defenses based on situation
 * @param {object} data - Situation data
 * @param {object} evictionType - Eviction type information
 * @returns {array} List of applicable defenses
 */
function identifyDefenses(data, evictionType) {
  const defenses = [];
  const procedureDefenses = evictionType.procedures?.defenseOptions || [];

  // Map situation data to defense applicability
  procedureDefenses.forEach(procedureDefense => {
    const defense = mapProcedureDefense(procedureDefense, data);
    if (defense) {
      defenses.push(defense);
    }
  });

  // Add universal defenses based on data
  addUniversalDefenses(defenses, data);

  return defenses;
}

/**
 * Map procedure defense to actual defense based on situation
 */
function mapProcedureDefense(procedureDefense, data) {
  const defense = {
    id: procedureDefense.id,
    name: procedureDefense.name,
    description: procedureDefense.description,
    checklist: procedureDefense.checklist || [],
    documentation: procedureDefense.documentation || [],
    strength: 'potential',
    citation: procedureDefense.citation || null,
    caveat: procedureDefense.caveat || null
  };

  // Determine strength based on situation data
  switch (procedureDefense.id) {
    case 'improper_notice':
    case 'improper_notice_30':
    case 'improper_termination_notice':
    case 'improper_3_day_notice':
      defense.strength = (data.noticeReceived !== true && data.noticeReceived !== 'true') ? 'strong' : 'potential';
      break;

    case 'payment_made':
      defense.strength = (data.paymentMade === true || data.paymentMade === 'true') ? 'strong' : 'potential';
      break;

    case 'habitability':
      defense.strength = (data.propertyCondition === 'poor' || data.propertyCondition === 'uninhabitable') ? 'moderate' : 'potential';
      break;

    case 'retaliation':
      defense.strength = (data.recentComplaint === true || data.recentComplaint === 'true') ? 'moderate' : 'potential';
      break;

    case 'violation_cured':
      defense.strength = (data.violationCured === true || data.violationCured === 'true') ? 'strong' : 'potential';
      break;

    case 'no_violation':
      defense.strength = 'potential'; // Always requires investigation
      break;

    case 'new_tenancy_created':
      defense.strength = (data.rentAcceptedAfterLeaseEnd === true || data.rentAcceptedAfterLeaseEnd === 'true') ? 'moderate' : 'potential';
      break;

    case 'lack_of_knowledge':
      defense.strength = (data.tenantUnaware === true || data.tenantUnaware === 'true') ? 'moderate' : 'potential';
      break;

    case 'prompt_action':
      defense.strength = (data.reportedActivity === true || data.reportedActivity === 'true') ? 'moderate' : 'potential';
      break;

    default:
      defense.strength = 'potential';
  }

  return defense;
}

/**
 * Add universal defenses applicable to all eviction types
 */
function addUniversalDefenses(defenses, data) {
  // Partial payment acceptance
  if (data.partialPaymentAccepted === true || data.partialPaymentAccepted === 'true') {
    defenses.push({
      id: 'partial_payment_acceptance',
      name: 'Acceptance of Partial Payment',
      description: 'Landlord accepted partial payment after notice, potentially waiving eviction right',
      strength: 'moderate',
      documentation: ['Receipt showing payment', 'Bank records', 'Text/email confirmation'],
      caveat: 'Effect varies based on circumstances and lease terms'
    });
  }

  // Self-help eviction (always add as potential)
  if (data.locksChanged === true || data.locksChanged === 'true' ||
      data.utilitiesShutOff === true || data.utilitiesShutOff === 'true') {
    defenses.push({
      id: 'self_help_eviction',
      name: 'Illegal Self-Help Eviction',
      description: 'Landlord attempted illegal self-help eviction methods',
      strength: 'strong',
      citation: 'TCA 66-28-512',
      documentation: ['Photos of changed locks', 'Utility shut-off records', 'Witness statements'],
      remedies: ['May be entitled to damages', 'May recover actual damages plus up to 3 months rent']
    });
  }
}

/**
 * Prioritize defenses by strength
 * @param {array} defenses - List of defenses
 * @returns {array} Prioritized defenses
 */
function prioritizeDefenses(defenses) {
  const strengthOrder = { 'strong': 1, 'moderate': 2, 'potential': 3 };

  return [...defenses].sort((a, b) => {
    const orderA = strengthOrder[a.strength] || 4;
    const orderB = strengthOrder[b.strength] || 4;
    return orderA - orderB;
  });
}

/**
 * Generate next steps based on analysis
 * @param {object} data - Situation data
 * @param {object} analysis - Analysis results
 * @returns {array} List of next steps
 */
function generateNextSteps(data, analysis) {
  const steps = [];

  // Handle critical situations first
  if (analysis.urgencyLevel === 'critical') {
    if (data.judgmentReceived === true || data.judgmentReceived === 'true') {
      const timeline = analysis.timelineAnalysis;
      if (timeline.calculationDetails.daysLeftToAppeal > 0) {
        steps.push({
          priority: 'critical',
          action: 'File appeal immediately',
          details: `You have ${timeline.calculationDetails.daysLeftToAppeal} days left to appeal the judgment`,
          deadline: `${timeline.calculationDetails.daysLeftToAppeal} days`,
          howTo: 'File Notice of Appeal with General Sessions Court Clerk; post appeal bond'
        });
      }
    }
  }

  // Court appearance
  if (data.courtDate) {
    const daysUntilCourt = analysis.timelineAnalysis.calculationDetails.daysUntilCourt;
    if (daysUntilCourt > 0) {
      steps.push({
        priority: 'critical',
        action: `Attend court hearing on ${data.courtDate}`,
        details: 'Failure to appear usually results in automatic eviction judgment',
        deadline: data.courtDate,
        howTo: 'Arrive 30 minutes early; bring all documentation; dress appropriately'
      });
    }
  }

  // Documentation gathering
  steps.push({
    priority: 'high',
    action: 'Gather documentation',
    details: 'Collect lease, notices, receipts, photos, communications with landlord',
    deadline: 'Before court date',
    checklist: [
      'Copy of lease',
      'All notices received from landlord',
      'Rent payment receipts',
      'Photos of property condition',
      'Text/email communications',
      'Bank statements showing payments'
    ]
  });

  // Legal assistance
  steps.push({
    priority: 'high',
    action: 'Contact legal aid organization',
    details: 'Free legal assistance may be available for income-qualified tenants',
    deadline: 'As soon as possible',
    resource: getCountyResources(data.county).legalAid
  });

  // Defense preparation
  if (analysis.recommendedDefenses.length > 0) {
    const topDefense = analysis.recommendedDefenses[0];
    steps.push({
      priority: 'high',
      action: `Prepare "${topDefense.name}" defense`,
      details: topDefense.description,
      deadline: 'Before court date',
      checklist: topDefense.documentation || topDefense.checklist
    });
  }

  // Answer filing
  if (data.courtDate && analysis.timelineAnalysis.calculationDetails.daysUntilCourt > 3) {
    steps.push({
      priority: 'medium',
      action: 'Consider filing written answer',
      details: 'Filing an answer before hearing can help organize your defense',
      deadline: '3 business days before court date',
      howTo: 'File with Court Clerk; include all affirmative defenses'
    });
  }

  return steps;
}

/**
 * Determine urgency level
 * @param {object} data - Situation data
 * @returns {string} Urgency level
 */
function determineUrgency(data) {
  // Judgment received = critical (10-day appeal window)
  if (data.judgmentReceived === true || data.judgmentReceived === 'true') {
    return 'critical';
  }

  // Court date proximity
  if (data.courtDate) {
    const courtDate = new Date(data.courtDate);
    const today = new Date();
    const daysUntilCourt = Math.ceil((courtDate - today) / (1000 * 60 * 60 * 24));

    if (daysUntilCourt <= 3) return 'critical';
    if (daysUntilCourt <= 7) return 'urgent';
    if (daysUntilCourt <= 14) return 'elevated';
  }

  return 'standard';
}

/**
 * Get county-specific resources
 * @param {string} county - County name
 * @returns {object} County resources
 */
function getCountyResources(county) {
  const countyLower = (county || '').toLowerCase();
  const statewideResources = statutesData.resources.legalAid.statewide;

  const countySpecificResources = {
    davidson: statutesData.resources.legalAid.davidson,
    shelby: statutesData.resources.legalAid.shelby,
    knox: statutesData.resources.legalAid.knox,
    hamilton: statutesData.resources.legalAid.hamilton
  };

  const legalAid = countySpecificResources[countyLower] || statewideResources;

  return {
    legalAid,
    statewide: statewideResources,
    tenantOrganizations: statutesData.resources.tenantOrganizations
  };
}

module.exports = {
  analyzeSituation,
  determineEvictionType,
  analyzeTimeline,
  identifyDefenses,
  prioritizeDefenses,
  generateNextSteps,
  determineUrgency,
  getCountyResources
};
