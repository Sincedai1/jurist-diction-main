/**
 * Multi-State Expungement Packet Generator
 * Supports: Tennessee (TN), Pennsylvania (PA), New Jersey (NJ)
 *
 * UPL COMPLIANT: This module provides educational information only.
 * All responses include appropriate disclaimers.
 */

const fs = require('fs');
const path = require('path');

// State configurations
const STATE_CONFIG = {
  TN: {
    name: 'Tennessee',
    dataPath: 'data/expungement/tn',
    cleanSlate: false,
    hasAutomaticSealing: false
  },
  PA: {
    name: 'Pennsylvania',
    dataPath: 'data/expungement/pa',
    cleanSlate: true,
    hasAutomaticSealing: true
  },
  NJ: {
    name: 'New Jersey',
    dataPath: 'data/expungement/nj',
    cleanSlate: true,
    hasAutomaticSealing: true
  }
};

/**
 * Get the base path for data files
 */
function getBasePath() {
  // When running as a module, use __dirname relative path
  // When running from command line, use process.cwd()
  const modulePath = path.join(__dirname, '..', 'data');
  const cwdPath = path.join(process.cwd(), 'data');

  if (fs.existsSync(path.join(modulePath, 'expungement'))) {
    return path.join(__dirname, '..');
  }
  return process.cwd();
}

/**
 * Load state-specific statutes
 */
function loadStatutes(state) {
  const config = STATE_CONFIG[state];
  if (!config) return null;

  try {
    const basePath = getBasePath();
    const statutesPath = path.join(basePath, config.dataPath, 'statutes.json');
    if (fs.existsSync(statutesPath)) {
      return JSON.parse(fs.readFileSync(statutesPath, 'utf8'));
    }
    return null;
  } catch (error) {
    console.error(`Error loading statutes for ${state}:`, error);
    return null;
  }
}

/**
 * Load state-specific procedures
 */
function loadProcedures(state) {
  const config = STATE_CONFIG[state];
  if (!config) return null;

  try {
    const basePath = getBasePath();
    const proceduresPath = path.join(basePath, config.dataPath, 'procedures.json');
    if (fs.existsSync(proceduresPath)) {
      return JSON.parse(fs.readFileSync(proceduresPath, 'utf8'));
    }
    return null;
  } catch (error) {
    console.error(`Error loading procedures for ${state}:`, error);
    return null;
  }
}

/**
 * Load county-specific data
 */
function loadCountyData(state, county) {
  const config = STATE_CONFIG[state];
  if (!config) return null;

  try {
    const basePath = getBasePath();
    const countyPath = path.join(basePath, config.dataPath, 'counties', `${county.toLowerCase()}.json`);
    if (fs.existsSync(countyPath)) {
      return JSON.parse(fs.readFileSync(countyPath, 'utf8'));
    }
    return null;
  } catch (error) {
    console.error(`Error loading county data for ${county}, ${state}:`, error);
    return null;
  }
}

/**
 * List available counties for a state
 */
function listCounties(state) {
  const config = STATE_CONFIG[state];
  if (!config) return [];

  try {
    const basePath = getBasePath();
    const countiesPath = path.join(basePath, config.dataPath, 'counties');
    if (fs.existsSync(countiesPath)) {
      const files = fs.readdirSync(countiesPath)
        .filter(f => f.endsWith('.json') && !f.startsWith('_'))
        .map(f => f.replace('.json', ''));

      return files.map(county => {
        const countyData = loadCountyData(state, county);
        return {
          name: countyData?.county || county.charAt(0).toUpperCase() + county.slice(1),
          countySeat: countyData?.countySeat || 'Unknown',
          judicialDistrict: countyData?.judicialDistrict || countyData?.vicinage || 'Unknown'
        };
      });
    }
    return [];
  } catch (error) {
    console.error(`Error listing counties for ${state}:`, error);
    return [];
  }
}

/**
 * Analyze expungement eligibility based on situation data
 */
function analyzeEligibility(state, situationData) {
  const statutes = loadStatutes(state);
  const procedures = loadProcedures(state);

  if (!statutes || !procedures) {
    return {
      eligible: false,
      error: `State ${state} not supported or data not available`
    };
  }

  const analysis = {
    state: state,
    stateName: STATE_CONFIG[state]?.name || state,
    eligibility: {
      status: 'pending',
      confidence: 'medium',
      waitingPeriod: null,
      waitingPeriodMet: null,
      reasons: [],
      blockingFactors: []
    },
    cleanSlate: {
      available: STATE_CONFIG[state]?.cleanSlate || false,
      automaticSealing: STATE_CONFIG[state]?.hasAutomaticSealing || false,
      eligible: false,
      estimatedTimeline: null
    },
    petitionBased: {
      available: true,
      eligible: false,
      estimatedTimeline: null
    },
    applicableProcedure: null,
    nextSteps: [],
    warnings: [],
    recommendations: []
  };

  // Determine charge type and outcome
  const chargeType = situationData.chargeType?.toLowerCase() || '';
  const outcome = situationData.outcome?.toLowerCase() || '';
  const hasConviction = ['conviction', 'convicted', 'guilty', 'plea'].some(o => outcome.includes(o));
  const wasDismissed = ['dismissed', 'acquitted', 'not guilty', 'nolle prosequi', 'withdrawn'].some(o => outcome.includes(o));
  const completedDiversion = ['diversion', 'ard', 'probation completed', 'program completed'].some(o => outcome.includes(o));

  // Check waiting period
  const convictionDate = situationData.convictionDate ? new Date(situationData.convictionDate) : null;
  const sentenceCompletionDate = situationData.sentenceCompletionDate ? new Date(situationData.sentenceCompletionDate) : null;
  const yearsSinceDisposition = calculateYearsSince(sentenceCompletionDate || convictionDate);

  // State-specific analysis
  switch (state) {
    case 'PA':
      analyzePAEligibility(analysis, situationData, statutes, {
        hasConviction,
        wasDismissed,
        completedDiversion,
        chargeType,
        yearsSinceDisposition
      });
      break;

    case 'NJ':
      analyzeNJEligibility(analysis, situationData, statutes, {
        hasConviction,
        wasDismissed,
        completedDiversion,
        chargeType,
        yearsSinceDisposition
      });
      break;

    case 'TN':
      analyzeTNEligibility(analysis, situationData, statutes, {
        hasConviction,
        wasDismissed,
        completedDiversion,
        chargeType,
        yearsSinceDisposition
      });
      break;

    default:
      analysis.eligibility.status = 'unknown';
      analysis.warnings.push(`State ${state} analysis not implemented`);
  }

  return analysis;
}

/**
 * Pennsylvania-specific eligibility analysis
 */
function analyzePAEligibility(analysis, situationData, statutes, context) {
  const { hasConviction, wasDismissed, completedDiversion, chargeType, yearsSinceDisposition } = context;

  // Check Clean Slate eligibility
  if (wasDismissed) {
    analysis.cleanSlate.eligible = true;
    analysis.cleanSlate.estimatedTimeline = 'Automatic sealing - no waiting period';
    analysis.eligibility.status = 'eligible';
    analysis.eligibility.reasons.push('Non-conviction records are automatically sealed under Clean Slate');
    analysis.applicableProcedure = 'cleanSlateAutomatic';
  } else if (hasConviction) {
    // Check if offense is excluded
    const isDUI = chargeType.includes('dui') || chargeType.includes('dwi') || chargeType.includes('driving under');
    const isViolent = chargeType.includes('violent') || chargeType.includes('assault') || chargeType.includes('robbery');
    const isSexOffense = chargeType.includes('sex') || chargeType.includes('rape') || chargeType.includes('molestation');
    const isChildCrime = chargeType.includes('child') || chargeType.includes('minor');

    if (isDUI) {
      analysis.eligibility.blockingFactors.push({
        factor: 'DUI Conviction',
        description: 'DUI convictions are not eligible for automatic Clean Slate sealing in Pennsylvania'
      });
      analysis.eligibility.status = 'limited';
      analysis.warnings.push('DUI convictions require petition-based expungement and may have limited eligibility');
      analysis.applicableProcedure = 'ardCompletion';
    } else if (isViolent || isSexOffense || isChildCrime) {
      analysis.eligibility.blockingFactors.push({
        factor: 'Excluded Offense',
        description: 'This offense type is excluded from Clean Slate automatic sealing'
      });
      analysis.eligibility.status = 'ineligible';
    } else if (chargeType.includes('felony') || chargeType.includes('indictable')) {
      // Non-violent felony
      if (yearsSinceDisposition >= 10) {
        analysis.cleanSlate.eligible = true;
        analysis.cleanSlate.estimatedTimeline = 'Automatic sealing - 10-year period met';
        analysis.eligibility.status = 'eligible';
        analysis.eligibility.reasons.push('Non-violent felony eligible for Clean Slate after 10 years');
        analysis.applicableProcedure = 'nonViolentFelony';
      } else {
        analysis.eligibility.status = 'pending';
        analysis.eligibility.waitingPeriod = `${10 - yearsSinceDisposition} more years`;
        analysis.eligibility.waitingPeriodMet = false;
        analysis.eligibility.reasons.push(`Must wait until 10-year period is complete (${10 - yearsSinceDisposition} more years)`);
        analysis.applicableProcedure = 'nonViolentFelony';
      }
    } else if (chargeType.includes('misdemeanor')) {
      if (yearsSinceDisposition >= 10) {
        analysis.cleanSlate.eligible = true;
        analysis.cleanSlate.estimatedTimeline = 'Automatic sealing - 10-year period met';
        analysis.eligibility.status = 'eligible';
        analysis.eligibility.reasons.push('Misdemeanor eligible for Clean Slate after 10 years');
        analysis.applicableProcedure = 'cleanSlateAutomatic';
      } else {
        analysis.eligibility.status = 'pending';
        analysis.eligibility.waitingPeriod = `${10 - yearsSinceDisposition} more years`;
        analysis.eligibility.waitingPeriodMet = false;
        analysis.eligibility.reasons.push(`Must wait until 10-year period is complete (${10 - yearsSinceDisposition} more years)`);
        analysis.applicableProcedure = 'cleanSlateAutomatic';
      }
    } else if (chargeType.includes('summary')) {
      if (yearsSinceDisposition >= 5) {
        analysis.cleanSlate.eligible = true;
        analysis.cleanSlate.estimatedTimeline = 'Automatic sealing - 5-year period met';
        analysis.eligibility.status = 'eligible';
        analysis.eligibility.reasons.push('Summary offense eligible for Clean Slate after 5 years');
        analysis.applicableProcedure = 'summaryOffense';
      } else {
        analysis.eligibility.status = 'pending';
        analysis.eligibility.waitingPeriod = `${5 - yearsSinceDisposition} more years`;
        analysis.eligibility.waitingPeriodMet = false;
        analysis.eligibility.reasons.push(`Must wait until 5-year period is complete (${5 - yearsSinceDisposition} more years)`);
        analysis.applicableProcedure = 'summaryOffense';
      }
    }
  } else if (completedDiversion || chargeType.includes('ard')) {
    analysis.petitionBased.eligible = true;
    analysis.petitionBased.estimatedTimeline = '30-60 days after filing';
    analysis.eligibility.status = 'eligible';
    analysis.eligibility.reasons.push('ARD/diversion completion is eligible for petition-based expungement');
    analysis.applicableProcedure = 'ardCompletion';
  }

  // Add next steps
  if (analysis.cleanSlate.eligible) {
    analysis.nextSteps.push('Your record may be automatically sealed - verify status with PA State Police');
    analysis.nextSteps.push('Check PAeDocket (ujsportal.pacourts.us) to see if case is sealed');
  }
  if (analysis.petitionBased.eligible) {
    analysis.nextSteps.push('File petition for expungement with Court of Common Pleas');
    analysis.nextSteps.push('Serve copy on District Attorney');
  }

  analysis.recommendations.push('Pennsylvania Clean Slate is FREE - no petition required for automatic sealing');
}

/**
 * New Jersey-specific eligibility analysis
 */
function analyzeNJEligibility(analysis, situationData, statutes, context) {
  const { hasConviction, wasDismissed, completedDiversion, chargeType, yearsSinceDisposition } = context;

  // Check Clean Slate eligibility
  if (wasDismissed) {
    analysis.petitionBased.eligible = true;
    analysis.petitionBased.estimatedTimeline = '6-month waiting period, then 30-60 days for petition';
    analysis.eligibility.status = 'eligible';
    analysis.eligibility.reasons.push('Dismissed charges eligible for expungement after 6 months');
    analysis.applicableProcedure = 'arrestNoConviction';
  } else if (hasConviction) {
    // Check if offense is excluded
    const isExcluded = [
      'murder', 'homicide', 'kidnapping', 'sexual assault', 'rape',
      'robbery', 'arson', 'child porn', 'terrorism', 'perjury', 'official misconduct'
    ].some(term => chargeType.includes(term));

    const isDrugDistribution = chargeType.includes('distribution') || chargeType.includes('manufacturing') || chargeType.includes('trafficking');
    const isIndictable = chargeType.includes('felony') || chargeType.includes('indictable');
    const isDisorderly = chargeType.includes('misdemeanor') || chargeType.includes('disorderly');
    const isMunicipal = chargeType.includes('ordinance') || chargeType.includes('municipal');
    const isDomesticViolence = chargeType.includes('domestic') || chargeType.includes('dv');

    if (isExcluded) {
      analysis.eligibility.blockingFactors.push({
        factor: 'Excluded Offense',
        description: 'This offense type is not eligible for expungement in New Jersey'
      });
      analysis.eligibility.status = 'ineligible';
    } else if (isDrugDistribution) {
      analysis.eligibility.blockingFactors.push({
        factor: 'Drug Distribution',
        description: 'Drug distribution/manufacturing offenses are generally not eligible for expungement'
      });
      analysis.eligibility.status = 'limited';
      analysis.warnings.push('Drug distribution offenses have very limited expungement eligibility');
    } else if (isIndictable) {
      // Indictable offense (felony)
      if (yearsSinceDisposition >= 10) {
        analysis.cleanSlate.eligible = true;
        analysis.petitionBased.eligible = true;
        analysis.cleanSlate.estimatedTimeline = 'Automatic - Clean Slate process';
        analysis.petitionBased.estimatedTimeline = '60-120 days';
        analysis.eligibility.status = 'eligible';
        analysis.eligibility.reasons.push('Eligible for both Clean Slate (automatic) and petition-based expungement');
        analysis.applicableProcedure = 'indictableOffense';
      } else if (yearsSinceDisposition >= 5) {
        analysis.petitionBased.eligible = true;
        analysis.petitionBased.estimatedTimeline = '60-120 days';
        analysis.eligibility.status = 'eligible';
        analysis.eligibility.reasons.push('Eligible for 5-year early pathway expungement');
        analysis.applicableProcedure = 'indictableOffense';
        analysis.warnings.push('Early pathway requires showing compelling need');
      } else {
        analysis.eligibility.status = 'pending';
        analysis.eligibility.waitingPeriod = `${5 - yearsSinceDisposition} more years (early pathway) or ${10 - yearsSinceDisposition} more years (standard)`;
        analysis.eligibility.waitingPeriodMet = false;
        analysis.applicableProcedure = 'indictableOffense';
      }
    } else if (isDisorderly) {
      // Disorderly persons offense
      if (yearsSinceDisposition >= 5) {
        analysis.cleanSlate.eligible = true;
        analysis.petitionBased.eligible = true;
        analysis.eligibility.status = 'eligible';
        analysis.eligibility.reasons.push('Disorderly persons offense eligible after 5 years');
        analysis.applicableProcedure = 'disorderlyPersons';
      } else if (yearsSinceDisposition >= 4) {
        analysis.petitionBased.eligible = true;
        analysis.eligibility.status = 'eligible';
        analysis.eligibility.reasons.push('Eligible for 4-year early pathway');
        analysis.applicableProcedure = 'disorderlyPersons';
      } else {
        analysis.eligibility.status = 'pending';
        analysis.eligibility.waitingPeriod = `${5 - yearsSinceDisposition} more years`;
        analysis.applicableProcedure = 'disorderlyPersons';
      }

      if (isDomesticViolence) {
        analysis.eligibility.blockingFactors.push({
          factor: 'Domestic Violence',
          description: 'Certain domestic violence offenses may not be eligible'
        });
      }
    } else if (isMunicipal) {
      if (yearsSinceDisposition >= 2) {
        analysis.eligibility.status = 'eligible';
        analysis.petitionBased.eligible = true;
        analysis.eligibility.reasons.push('Municipal ordinance eligible after 2 years');
        analysis.applicableProcedure = 'municipalOrdinance';
      } else {
        analysis.eligibility.status = 'pending';
        analysis.eligibility.waitingPeriod = `${2 - yearsSinceDisposition} more years`;
        analysis.applicableProcedure = 'municipalOrdinance';
      }
    }
  } else if (completedDiversion || chargeType.includes('drug court')) {
    analysis.petitionBased.eligible = true;
    analysis.petitionBased.estimatedTimeline = '30-60 days';
    analysis.eligibility.status = 'eligible';
    analysis.eligibility.reasons.push('Drug court graduates eligible for immediate expungement');
    analysis.applicableProcedure = 'drugCourtGraduate';
  }

  // Add next steps
  if (analysis.cleanSlate.eligible) {
    analysis.nextSteps.push('Your record may be automatically expunged under Clean Slate - verify with NJ State Police');
  }
  if (analysis.petitionBased.eligible) {
    analysis.nextSteps.push('File petition with Superior Court in county where arrest occurred');
    analysis.nextSteps.push('Serve County Prosecutor, Attorney General, and State Police');
    analysis.nextSteps.push('$75 filing fee required (may be waived for indigent)');
  }

  analysis.recommendations.push('New Jersey Clean Slate is FREE - automatic after 10 crime-free years');
}

/**
 * Tennessee-specific eligibility analysis (existing implementation)
 */
function analyzeTNEligibility(analysis, situationData, statutes, context) {
  const { hasConviction, wasDismissed, completedDiversion, chargeType, yearsSinceDisposition } = context;

  if (wasDismissed) {
    analysis.eligibility.status = 'eligible';
    analysis.eligibility.reasons.push('Dismissed or acquitted charges are immediately eligible');
    analysis.petitionBased.eligible = true;
    analysis.petitionBased.estimatedTimeline = '30-60 days';
    analysis.applicableProcedure = 'dismissedCharges';
  } else if (completedDiversion) {
    analysis.eligibility.status = 'eligible';
    analysis.eligibility.reasons.push('Completed diversion is eligible for expungement');
    analysis.petitionBased.eligible = true;
    analysis.petitionBased.estimatedTimeline = '30-60 days';
    analysis.applicableProcedure = situationData.diversionType?.includes('judicial') ? 'judicialDiversion' : 'pretrialDiversion';
  } else if (hasConviction) {
    const isDUI = chargeType.includes('dui') || chargeType.includes('dwi');
    const isDomesticAssault = chargeType.includes('domestic') && chargeType.includes('assault');
    const isSexOffense = chargeType.includes('sex') || chargeType.includes('rape');
    const isFelony = chargeType.includes('felony');
    const isMisdemeanor = chargeType.includes('misdemeanor');

    if (isDUI || isDomesticAssault || isSexOffense) {
      analysis.eligibility.blockingFactors.push({
        factor: 'Ineligible Offense',
        description: 'This offense type is not eligible for expungement in Tennessee'
      });
      analysis.eligibility.status = 'ineligible';
    } else if (isFelony) {
      if (yearsSinceDisposition >= 5) {
        analysis.eligibility.status = 'eligible';
        analysis.eligibility.reasons.push('Non-violent felony eligible after 5 years');
        analysis.petitionBased.eligible = true;
        analysis.petitionBased.estimatedTimeline = '90-120 days';
        analysis.applicableProcedure = 'felonyConviction';
      } else {
        analysis.eligibility.status = 'pending';
        analysis.eligibility.waitingPeriod = `${5 - yearsSinceDisposition} more years`;
        analysis.applicableProcedure = 'felonyConviction';
      }
    } else if (isMisdemeanor) {
      if (yearsSinceDisposition >= 1) {
        analysis.eligibility.status = 'eligible';
        analysis.eligibility.reasons.push('Misdemeanor eligible after 1 year');
        analysis.petitionBased.eligible = true;
        analysis.petitionBased.estimatedTimeline = '60-90 days';
        analysis.applicableProcedure = 'misdemeanorConviction';
      } else {
        analysis.eligibility.status = 'pending';
        analysis.eligibility.waitingPeriod = `${1 - yearsSinceDisposition} more years`;
        analysis.applicableProcedure = 'misdemeanorConviction';
      }
    }
  }

  if (analysis.petitionBased.eligible) {
    analysis.nextSteps.push('File petition with convicting court');
    analysis.nextSteps.push('Serve District Attorney (30 days to object)');
  }
}

/**
 * Calculate years since a date
 */
function calculateYearsSince(date) {
  if (!date) return 0;
  const now = new Date();
  const diffMs = now - date;
  const years = diffMs / (1000 * 60 * 60 * 24 * 365.25);
  return Math.floor(years);
}

/**
 * Generate a complete expungement packet
 */
function generatePacket(options) {
  const { state, situation, county, format = 'json' } = options;

  const statutes = loadStatutes(state);
  const procedures = loadProcedures(state);
  const countyData = county ? loadCountyData(state, county) : null;
  const analysis = analyzeEligibility(state, situation);

  const packet = {
    meta: {
      state: state,
      stateName: STATE_CONFIG[state]?.name || state,
      county: county,
      generatedAt: new Date().toISOString(),
      disclaimer: 'This information is for educational purposes only and does not constitute legal advice. Consult a licensed attorney for legal guidance.'
    },
    analysis: analysis,
    statutes: statutes ? {
      jurisdiction: statutes.jurisdiction,
      cleanSlate: statutes.cleanSlate,
      waitingPeriods: statutes.waitingPeriods,
      effects: statutes.effects,
      fees: statutes.fees
    } : null,
    procedures: procedures ? {
      applicableProcedure: analysis.applicableProcedure,
      procedureDetails: procedures.procedures?.[analysis.applicableProcedure] || null,
      checklist: procedures.checklist
    } : null,
    countyData: countyData,
    resources: {
      legalAid: countyData?.resources?.legalAid || [],
      specialPrograms: countyData?.specialPrograms || []
    }
  };

  if (format === 'text') {
    return generateTextPacket(packet);
  }

  return packet;
}

/**
 * Generate text format packet
 */
function generateTextPacket(packet) {
  const lines = [];

  lines.push('='.repeat(60));
  lines.push(`${packet.meta.stateName} Expungement Information Packet`);
  lines.push('='.repeat(60));
  lines.push('');
  lines.push(`Generated: ${new Date(packet.meta.generatedAt).toLocaleDateString()}`);
  lines.push(`County: ${packet.meta.county || 'Not specified'}`);
  lines.push('');

  lines.push('-'.repeat(60));
  lines.push('IMPORTANT DISCLAIMER');
  lines.push('-'.repeat(60));
  lines.push(packet.meta.disclaimer);
  lines.push('');

  if (packet.analysis) {
    lines.push('-'.repeat(60));
    lines.push('ELIGIBILITY ANALYSIS');
    lines.push('-'.repeat(60));
    lines.push(`Status: ${packet.analysis.eligibility.status.toUpperCase()}`);
    lines.push(`Confidence: ${packet.analysis.eligibility.confidence}`);

    if (packet.analysis.eligibility.reasons.length > 0) {
      lines.push('');
      lines.push('Reasons:');
      packet.analysis.eligibility.reasons.forEach(r => lines.push(`  - ${r}`));
    }

    if (packet.analysis.eligibility.waitingPeriod) {
      lines.push(`Waiting Period Remaining: ${packet.analysis.eligibility.waitingPeriod}`);
    }

    if (packet.analysis.cleanSlate?.available) {
      lines.push('');
      lines.push(`Clean Slate Available: ${packet.analysis.cleanSlate.eligible ? 'YES' : 'Pending/No'}`);
      if (packet.analysis.cleanSlate.estimatedTimeline) {
        lines.push(`Clean Slate Timeline: ${packet.analysis.cleanSlate.estimatedTimeline}`);
      }
    }

    if (packet.analysis.nextSteps.length > 0) {
      lines.push('');
      lines.push('Next Steps:');
      packet.analysis.nextSteps.forEach((step, i) => lines.push(`  ${i + 1}. ${step}`));
    }
  }

  if (packet.countyData) {
    lines.push('');
    lines.push('-'.repeat(60));
    lines.push('COUNTY INFORMATION');
    lines.push('-'.repeat(60));
    lines.push(`County: ${packet.countyData.county}`);
    lines.push(`County Seat: ${packet.countyData.countySeat}`);
    lines.push(`Judicial District: ${packet.countyData.judicialDistrict || packet.countyData.vicinage || 'N/A'}`);

    if (packet.countyData.courtInformation?.courtOfCommonPleas || packet.countyData.courtInformation?.superiorCourt) {
      const court = packet.countyData.courtInformation.courtOfCommonPleas || packet.countyData.courtInformation.superiorCourt;
      lines.push('');
      lines.push('Court Information:');
      lines.push(`  Name: ${court.name}`);
      lines.push(`  Address: ${court.address}, ${court.city}, ${court.state} ${court.zip}`);
      lines.push(`  Phone: ${court.phone}`);
    }

    if (packet.countyData.fees) {
      lines.push('');
      lines.push('Fees:');
      Object.entries(packet.countyData.fees).forEach(([key, value]) => {
        if (key !== 'notes') {
          lines.push(`  ${key}: ${typeof value === 'number' ? `$${value}` : value}`);
        }
      });
    }
  }

  lines.push('');
  lines.push('-'.repeat(60));
  lines.push('RESOURCES');
  lines.push('-'.repeat(60));

  if (packet.resources.legalAid.length > 0) {
    lines.push('');
    lines.push('Legal Aid Organizations:');
    packet.resources.legalAid.forEach(org => {
      lines.push(`  - ${org.name}`);
      if (org.phone) lines.push(`    Phone: ${org.phone}`);
    });
  }

  lines.push('');
  lines.push('For specific legal advice, consult a licensed attorney.');
  lines.push('');
  lines.push('='.repeat(60));

  return lines.join('\n');
}

/**
 * Get supported states
 */
function getSupportedStates() {
  return Object.entries(STATE_CONFIG).map(([code, config]) => ({
    code,
    name: config.name,
    cleanSlate: config.cleanSlate,
    automaticSealing: config.hasAutomaticSealing
  }));
}

module.exports = {
  loadStatutes,
  loadProcedures,
  loadCountyData,
  listCounties,
  analyzeEligibility,
  generatePacket,
  generateTextPacket,
  getSupportedStates,
  STATE_CONFIG
};
