/**
 * Multi-State Eviction Defense Packet Generator
 * Generates comprehensive eviction defense packets for TN, PA, NJ, MS tenants
 *
 * UPL COMPLIANT: Generates informational packets only, not legal advice.
 */

const fs = require('fs');
const path = require('path');

// State configurations
const STATE_CONFIG = {
  tn: {
    name: 'Tennessee',
    abbreviation: 'TN',
    dataPath: 'tn',
    noticePeriods: {
      nonpayment: 14,
      leaseViolation: 30,
      holdover: 30,
      illegalActivity: 3
    },
    appealDays: 10,
    courts: {
      initial: 'General Sessions Court',
      appeal: 'Circuit Court'
    }
  },
  pa: {
    name: 'Pennsylvania',
    abbreviation: 'PA',
    dataPath: 'pa',
    noticePeriods: {
      nonpayment: 10,
      leaseViolation: 15,
      holdover: 30
    },
    appealDays: 30,
    courts: {
      initial: 'Magisterial District Court',
      appeal: 'Court of Common Pleas'
    }
  },
  nj: {
    name: 'New Jersey',
    abbreviation: 'NJ',
    dataPath: 'nj',
    noticePeriods: {
      nonpayment: 30,
      leaseViolation: 'Notice to Cease + Notice to Quit',
      holdover: 30
    },
    appealDays: 45,
    courts: {
      initial: 'Special Civil Part',
      appeal: 'Appellate Division'
    },
    tenantProtectionRating: 'STRONGEST IN THE UNITED STATES'
  },
  ms: {
    name: 'Mississippi',
    abbreviation: 'MS',
    dataPath: 'ms',
    noticePeriods: {
      nonpayment: 3,
      leaseViolation: 30,
      holdover: 30
    },
    appealDays: 5,
    courts: {
      initial: 'Justice Court / County Court',
      appeal: 'Circuit Court'
    }
  }
};

// County configurations by state
const COUNTY_FILES = {
  tn: {
    davidson: 'davidson.json',
    shelby: 'shelby.json',
    knox: 'knox.json'
  },
  pa: {
    philadelphia: 'philadelphia.json',
    allegheny: 'allegheny.json'
  },
  nj: {
    essex: 'essex.json',
    hudson: 'hudson.json'
  },
  ms: {
    hinds: 'hinds.json',
    harrison: 'harrison.json'
  }
};

/**
 * Load state-specific data
 * @param {string} state - State code (tn, pa, nj, ms)
 * @returns {object} State statutes and procedures data
 */
function loadStateData(state) {
  const stateLower = state.toLowerCase();
  const config = STATE_CONFIG[stateLower];

  if (!config) {
    throw new Error(`Unsupported state: ${state}`);
  }

  try {
    const basePath = path.join(__dirname, '..', 'data', 'eviction-defense', config.dataPath);
    const statutes = JSON.parse(fs.readFileSync(path.join(basePath, 'statutes.json'), 'utf8'));
    const procedures = JSON.parse(fs.readFileSync(path.join(basePath, 'procedures.json'), 'utf8'));

    return { statutes, procedures, config };
  } catch (error) {
    console.error(`Error loading data for ${state}:`, error.message);
    throw new Error(`Failed to load data for state: ${state}`);
  }
}

/**
 * Load county-specific information
 * @param {string} state - State code
 * @param {string} county - County name
 * @returns {object} County information
 */
function loadCountyInfo(state, county) {
  if (!county || !state) return null;

  const stateLower = state.toLowerCase();
  const countyLower = county.toLowerCase();
  const stateConfig = STATE_CONFIG[stateLower];

  if (!stateConfig) return null;

  const countyFiles = COUNTY_FILES[stateLower];
  if (!countyFiles) return null;

  const countyFile = countyFiles[countyLower];
  if (!countyFile) return null;

  try {
    const countyPath = path.join(
      __dirname,
      '..',
      'data',
      'eviction-defense',
      stateConfig.dataPath,
      'counties',
      countyFile
    );
    const countyData = JSON.parse(fs.readFileSync(countyPath, 'utf8'));
    return countyData;
  } catch (error) {
    console.error(`Error loading county data for ${county}, ${state}:`, error.message);
    return null;
  }
}

/**
 * Get list of supported states
 * @returns {array} List of supported states
 */
function getSupportedStates() {
  return Object.entries(STATE_CONFIG).map(([code, config]) => ({
    code: code.toUpperCase(),
    name: config.name,
    tenantProtectionRating: config.tenantProtectionRating || null
  }));
}

/**
 * Get list of counties for a state
 * @param {string} state - State code
 * @returns {array} List of counties
 */
function getCountiesForState(state) {
  const stateLower = state.toLowerCase();
  const countyFiles = COUNTY_FILES[stateLower];

  if (!countyFiles) return [];

  return Object.keys(countyFiles).map(county => ({
    name: county.charAt(0).toUpperCase() + county.slice(1),
    code: county
  }));
}

/**
 * Get eviction types for a state
 * @param {string} state - State code
 * @returns {array} List of eviction types
 */
function getEvictionTypes(state) {
  const stateLower = state.toLowerCase();
  const config = STATE_CONFIG[stateLower];

  if (!config) return [];

  const types = [
    {
      type: 'nonpayment',
      displayName: 'Non-Payment of Rent',
      noticeRequired: config.noticePeriods.nonpayment,
      description: 'Landlord claims tenant has not paid rent as required by lease'
    },
    {
      type: 'leaseViolation',
      displayName: 'Lease Violation',
      noticeRequired: config.noticePeriods.leaseViolation,
      description: 'Landlord claims tenant violated terms of lease agreement'
    },
    {
      type: 'holdover',
      displayName: 'Holdover Tenant',
      noticeRequired: config.noticePeriods.holdover,
      description: 'Landlord claims tenant remained after lease ended'
    }
  ];

  // Add illegal activity for TN and MS
  if (stateLower === 'tn' || stateLower === 'ms') {
    types.push({
      type: 'illegalActivity',
      displayName: 'Criminal/Illegal Activity',
      noticeRequired: config.noticePeriods.illegalActivity || 3,
      description: 'Landlord claims criminal or illegal activity occurred on premises'
    });
  }

  return types;
}

/**
 * Generate a complete eviction defense packet for any supported state
 * @param {object} situationData - Tenant's situation data
 * @param {string} situationData.state - State code (tn, pa, nj, ms)
 * @returns {object} Generated packet data
 */
function generatePacket(situationData) {
  const state = (situationData.state || 'tn').toLowerCase();
  const { statutes, procedures, config } = loadStateData(state);

  const packet = {
    metadata: {
      generatedAt: new Date().toISOString(),
      version: '2.0.0',
      jurisdiction: config.name,
      stateCode: state.toUpperCase(),
      packetType: 'eviction-defense',
      tenantProtectionRating: config.tenantProtectionRating || null
    },
    disclaimer: getEvictionDefenseDisclaimer(state),
    situationAnalysis: null,
    evictionType: null,
    timelineAnalysis: null,
    defenses: [],
    procedures: null,
    countyInfo: null,
    resources: null,
    documentContent: null
  };

  // Analyze the situation
  packet.situationAnalysis = analyzeSituationForState(situationData, state, statutes, procedures);
  packet.evictionType = packet.situationAnalysis.evictionType;
  packet.timelineAnalysis = packet.situationAnalysis.timelineAnalysis;
  packet.defenses = packet.situationAnalysis.recommendedDefenses;
  packet.resources = packet.situationAnalysis.resources;

  // Load county-specific information
  packet.countyInfo = loadCountyInfo(state, situationData.county);

  // Generate the document content
  packet.documentContent = generateDocumentContent(packet, situationData, state, config, statutes);

  return packet;
}

/**
 * Analyze situation for a specific state
 */
function analyzeSituationForState(situationData, state, statutes, procedures) {
  const config = STATE_CONFIG[state];
  const analysis = {
    evictionType: null,
    timelineAnalysis: { issues: [], noticeGiven: false },
    urgencyLevel: 'standard',
    recommendedDefenses: [],
    nextSteps: [],
    resources: null
  };

  // Determine eviction type
  const evictionReason = (situationData.evictionReason || situationData.reason || '').toLowerCase();
  analysis.evictionType = determineEvictionType(evictionReason, config);

  // Analyze timeline
  if (situationData.noticeDate) {
    analysis.timelineAnalysis.noticeGiven = true;
    // Add timeline analysis logic here
  }

  // Determine urgency
  if (situationData.courtDate) {
    const courtDate = new Date(situationData.courtDate);
    const today = new Date();
    const daysUntilCourt = Math.floor((courtDate - today) / (1000 * 60 * 60 * 24));

    if (daysUntilCourt <= 3) {
      analysis.urgencyLevel = 'critical';
    } else if (daysUntilCourt <= 7) {
      analysis.urgencyLevel = 'urgent';
    } else if (daysUntilCourt <= 14) {
      analysis.urgencyLevel = 'elevated';
    }
  }

  // Get defenses from state data
  const evictionTypeKey = analysis.evictionType.type;
  if (procedures.defenseStrategies && procedures.defenseStrategies[evictionTypeKey]) {
    const defenseOptions = procedures.defenseStrategies[evictionTypeKey].defenseOptions || [];
    analysis.recommendedDefenses = defenseOptions.slice(0, 5).map(d => ({
      id: d.id,
      name: d.name,
      description: d.description,
      strength: d.strength || 'potential',
      citation: d.citation || null,
      documentation: d.documentation || d.checklist || [],
      caveat: d.caveat || null
    }));
  } else if (statutes.defenseStrategies && statutes.defenseStrategies[evictionTypeKey]) {
    const defenses = statutes.defenseStrategies[evictionTypeKey].defenses || [];
    analysis.recommendedDefenses = defenses.slice(0, 5).map(d => ({
      id: d.defense.toLowerCase().replace(/\s+/g, '_'),
      name: d.defense,
      description: d.description,
      strength: 'potential',
      citation: d.citation || null,
      documentation: [],
      howToRaise: d.howToRaise || null
    }));
  }

  // Generate next steps
  analysis.nextSteps = generateNextSteps(situationData, analysis.urgencyLevel, state, config);

  // Get resources
  analysis.resources = statutes.resources || null;

  return analysis;
}

/**
 * Determine eviction type based on reason
 */
function determineEvictionType(reason, config) {
  if (reason.includes('non-payment') || reason.includes('nonpayment') || reason.includes('rent')) {
    return {
      type: 'nonpayment',
      displayName: 'Non-Payment of Rent',
      noticeRequired: config.noticePeriods.nonpayment,
      description: 'Landlord claims tenant has not paid rent as required by lease'
    };
  }

  if (reason.includes('violation') || reason.includes('breach')) {
    return {
      type: 'leaseViolation',
      displayName: 'Lease Violation',
      noticeRequired: config.noticePeriods.leaseViolation,
      description: 'Landlord claims tenant violated terms of lease agreement'
    };
  }

  if (reason.includes('holdover') || reason.includes('expired') || reason.includes('end of lease')) {
    return {
      type: 'holdover',
      displayName: 'Holdover Tenant',
      noticeRequired: config.noticePeriods.holdover,
      description: 'Landlord claims tenant remained after lease ended'
    };
  }

  if (reason.includes('illegal') || reason.includes('criminal') || reason.includes('drug')) {
    return {
      type: 'illegalActivity',
      displayName: 'Criminal/Illegal Activity',
      noticeRequired: config.noticePeriods.illegalActivity || 3,
      description: 'Landlord claims criminal or illegal activity occurred on premises'
    };
  }

  // Default to non-payment
  return {
    type: 'nonpayment',
    displayName: 'Non-Payment of Rent',
    noticeRequired: config.noticePeriods.nonpayment,
    description: 'Landlord claims tenant has not paid rent as required by lease'
  };
}

/**
 * Generate next steps based on situation
 */
function generateNextSteps(situationData, urgencyLevel, state, config) {
  const steps = [];

  // Always recommend legal aid first
  steps.push({
    priority: 'high',
    action: 'Contact Legal Aid',
    deadline: 'Immediately',
    details: 'Free legal assistance may be available for income-qualified tenants'
  });

  // State-specific steps
  if (state === 'nj') {
    steps.push({
      priority: 'high',
      action: 'Document Protected Activities',
      deadline: 'Before court',
      details: 'NJ has strongest tenant protections - document any complaints made about conditions'
    });
  }

  if (config.noticePeriods.nonpayment <= 3) {
    steps.push({
      priority: 'critical',
      action: 'Act Immediately',
      deadline: 'Within 24 hours',
      details: `${config.name} has very short notice periods - act now`
    });
  }

  steps.push({
    priority: 'high',
    action: 'Gather Documentation',
    deadline: 'Before court date',
    details: 'Collect lease, payment records, notices, and photos of any conditions'
  });

  steps.push({
    priority: 'high',
    action: 'Attend Court Hearing',
    deadline: situationData.courtDate || 'As scheduled',
    details: 'Failure to appear may result in default judgment against you'
  });

  return steps;
}

/**
 * Get state-specific disclaimer
 */
function getEvictionDefenseDisclaimer(state) {
  const stateName = STATE_CONFIG[state]?.name || 'your state';
  return `IMPORTANT: This information is for educational purposes only and does not constitute legal advice.
Laws and procedures vary by jurisdiction and change frequently. Consult a licensed attorney
in ${stateName} for advice specific to your situation. Court procedures and deadlines are strict -
missing a deadline can result in loss of rights.`;
}

/**
 * Get short disclaimer
 */
function getShortDisclaimer() {
  return 'This is informational only and does not constitute legal advice. Consult a licensed attorney.';
}

/**
 * Generate the document content (text/markdown)
 */
function generateDocumentContent(packet, situationData, state, config, statutes) {
  const content = {
    markdown: generateMarkdownContent(packet, situationData, state, config, statutes),
    plainText: null,
    summary: null
  };

  content.plainText = markdownToPlainText(content.markdown);
  content.summary = generateSummary(packet, situationData);

  return content;
}

/**
 * Generate markdown content for the packet
 */
function generateMarkdownContent(packet, situationData, state, config, statutes) {
  const sections = [];
  const county = situationData.county
    ? situationData.county.charAt(0).toUpperCase() + situationData.county.slice(1).toLowerCase()
    : 'Unknown';

  // State-specific highlights
  let protectionHighlight = '';
  if (state === 'nj') {
    protectionHighlight = `\n### NEW JERSEY HAS THE STRONGEST TENANT PROTECTIONS IN THE UNITED STATES\n\nKey protections:\n- Good cause required for ALL evictions\n- Lease expiration is NOT grounds for eviction\n- 90-day presumption of retaliation\n- Payment stops non-payment eviction anytime before judgment\n`;
  } else if (state === 'ms') {
    protectionHighlight = `\n### FAST TIMELINE WARNING\n\nMississippi has FASTER eviction timelines than most states:\n- Only 3 days to pay rent after notice\n- Only 5 days to appeal after judgment\n- Physical eviction can happen within 24-48 hours\n`;
  }

  // Title and Disclaimer
  sections.push(`# ${config.name.toUpperCase()} EVICTION DEFENSE PACKET
## ${county} County
${config.tenantProtectionRating ? `\n**Tenant Protection Rating: ${config.tenantProtectionRating}**` : ''}

*Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}*

---

## IMPORTANT DISCLAIMER

${getEvictionDefenseDisclaimer(state)}

---
${protectionHighlight}
## YOUR SITUATION ANALYSIS

### Eviction Type Identified
**${packet.evictionType.displayName}**

${packet.evictionType.description}

**Required Notice Period:** ${packet.evictionType.noticeRequired} ${typeof packet.evictionType.noticeRequired === 'number' ? 'days' : ''}

### Urgency Level: ${packet.situationAnalysis.urgencyLevel.toUpperCase()}

${packet.situationAnalysis.urgencyLevel === 'critical' ? '**IMMEDIATE ACTION REQUIRED** - Critical deadlines approaching!' :
  packet.situationAnalysis.urgencyLevel === 'urgent' ? '**URGENT** - Court date is approaching' :
  packet.situationAnalysis.urgencyLevel === 'elevated' ? '**ELEVATED** - Court date within 2 weeks' :
  'Standard timeline - prepare your defense'}

---

## DEADLINE WARNING

**Important deadlines in ${config.name}:**
- Appeal deadline: **${config.appealDays} days** after judgment
- Court: ${config.courts.initial}
- Appeal court: ${config.courts.appeal}

---

`);

  // Timeline Analysis Section
  if (packet.timelineAnalysis.issues.length > 0) {
    sections.push(`## TIMELINE ISSUES IDENTIFIED

The following timeline issues were identified:

| Issue | Severity | Details |
|-------|----------|---------|
${packet.timelineAnalysis.issues.map(issue => `| ${issue.type.replace(/_/g, ' ').toUpperCase()} | ${issue.severity.toUpperCase()} | ${issue.message} |`).join('\n')}

---
`);
  }

  // Defenses Section
  sections.push(`## YOUR POTENTIAL DEFENSES

Based on your situation in ${config.name}, the following defenses may apply:

`);

  packet.defenses.forEach((defense, index) => {
    const strengthLabel = defense.strength === 'strong' ? '[STRONG]' :
                         defense.strength === 'moderate' ? '[MODERATE]' : '[POTENTIAL]';

    sections.push(`### ${index + 1}. ${defense.name} ${strengthLabel}

${defense.description}
${defense.citation ? `\n*Legal Citation: ${defense.citation}*` : ''}

**Evidence/Documentation Needed:**
${defense.documentation && defense.documentation.length > 0
  ? defense.documentation.map(doc => `- ${doc}`).join('\n')
  : '- Gather all relevant documentation'}

${defense.caveat ? `\n*Note: ${defense.caveat}*` : ''}
${defense.howToRaise ? `\n*How to Raise: ${defense.howToRaise}*` : ''}

---
`);
  });

  // Next Steps Section
  sections.push(`## RECOMMENDED NEXT STEPS

| Priority | Action | Deadline | Details |
|----------|--------|----------|---------|
${packet.situationAnalysis.nextSteps.map(step => `| ${step.priority.toUpperCase()} | ${step.action} | ${step.deadline || 'N/A'} | ${step.details} |`).join('\n')}

---

## COURT PROCEDURES IN ${config.name.toUpperCase()}

### ${config.courts.initial} Process

1. **Complaint Filed** - Landlord files with court
2. **Service of Process** - You receive the complaint
3. **Court Hearing** - Both parties present evidence
4. **Judgment** - Judge rules for landlord or tenant
5. **Appeal Period** - ${config.appealDays} days to appeal if judgment against you
6. **Writ/Order of Possession** - If no appeal, order issued
7. **Physical Eviction** - Officer removes tenant

---

`);

  // County-Specific Information
  if (packet.countyInfo) {
    sections.push(`## ${county.toUpperCase()} COUNTY SPECIFIC INFORMATION

### Court Location
**${packet.countyInfo.court?.name || 'Contact court'}**
${packet.countyInfo.court?.address || ''}
${packet.countyInfo.court?.phone ? `Phone: ${packet.countyInfo.court.phone}` : ''}
${packet.countyInfo.court?.website ? `Website: ${packet.countyInfo.court.website}` : ''}

### Legal Aid Resources
${packet.countyInfo.legalAidResources?.[0] ? `
**${packet.countyInfo.legalAidResources[0].name}**
${packet.countyInfo.legalAidResources[0].address || ''}
${packet.countyInfo.legalAidResources[0].phone ? `Phone: ${packet.countyInfo.legalAidResources[0].phone}` : ''}
${packet.countyInfo.legalAidResources[0].website ? `Website: ${packet.countyInfo.legalAidResources[0].website}` : ''}
` : 'Contact the court for local legal aid resources'}

### Special Notes
${(packet.countyInfo.specialNotes || []).map(note => `- ${note}`).join('\n')}

---
`);
  }

  // Self-Help Warning
  sections.push(`## SELF-HELP EVICTION IS ILLEGAL

Your landlord CANNOT legally:
- Change your locks
- Remove your doors or windows
- Shut off your water, electricity, or gas
- Remove your belongings
- Threaten or harass you

If your landlord has done any of these, you may have a claim for damages.

---

## ADDITIONAL RESOURCES

### Statewide Legal Aid
${packet.resources?.legalAid?.statewide ? `
**${packet.resources.legalAid.statewide.name}**
Phone: ${packet.resources.legalAid.statewide.phone || 'Contact for phone'}
Website: ${packet.resources.legalAid.statewide.website || 'Contact for website'}
` : 'Contact your local legal aid organization'}

### Emergency Assistance
- Dial 2-1-1 for local resources
- Contact your county's social services agency
- Ask the court about rental assistance programs

---

*Generated by JURIST DICTION Eviction Defense System v2.0.0*
*This is informational only and does not constitute legal advice.*
`);

  return sections.join('\n');
}

/**
 * Generate a quick summary of the packet
 */
function generateSummary(packet, situationData) {
  return {
    evictionType: packet.evictionType.displayName,
    urgencyLevel: packet.situationAnalysis.urgencyLevel,
    topDefense: packet.defenses.length > 0 ? packet.defenses[0].name : 'None identified',
    nextStep: packet.situationAnalysis.nextSteps.length > 0
      ? packet.situationAnalysis.nextSteps[0].action
      : 'Consult legal aid',
    timelineIssues: packet.timelineAnalysis.issues.length,
    state: packet.metadata.jurisdiction,
    county: situationData.county || 'Unknown',
    courtDate: situationData.courtDate || 'Not provided'
  };
}

/**
 * Convert markdown to plain text
 */
function markdownToPlainText(markdown) {
  return markdown
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^[-*]\s+/gm, '  - ')
    .replace(/\|/g, ' | ')
    .replace(/[-]{3,}/g, '--------------------------------------------------------------------------------')
    .trim();
}

/**
 * Generate packet as JSON (for API responses)
 */
function generatePacketJson(situationData) {
  const packet = generatePacket(situationData);
  return {
    success: true,
    metadata: packet.metadata,
    summary: packet.documentContent.summary,
    analysis: {
      evictionType: packet.evictionType,
      timelineAnalysis: packet.timelineAnalysis,
      urgencyLevel: packet.situationAnalysis.urgencyLevel
    },
    defenses: packet.defenses,
    nextSteps: packet.situationAnalysis.nextSteps,
    countyInfo: packet.countyInfo ? {
      court: packet.countyInfo.court,
      legalAid: packet.countyInfo.legalAidResources?.[0]
    } : null,
    resources: packet.resources,
    disclaimer: getShortDisclaimer()
  };
}

/**
 * Generate packet as downloadable text
 */
function generatePacketText(situationData) {
  const packet = generatePacket(situationData);
  const state = (situationData.state || 'tn').toLowerCase();
  return {
    filename: `${state}-eviction-defense-${Date.now()}.txt`,
    content: packet.documentContent.plainText,
    mimeType: 'text/plain'
  };
}

/**
 * Generate packet as markdown
 */
function generatePacketMarkdown(situationData) {
  const packet = generatePacket(situationData);
  const state = (situationData.state || 'tn').toLowerCase();
  return {
    filename: `${state}-eviction-defense-${Date.now()}.md`,
    content: packet.documentContent.markdown,
    mimeType: 'text/markdown'
  };
}

module.exports = {
  generatePacket,
  generatePacketJson,
  generatePacketText,
  generatePacketMarkdown,
  generateDocumentContent,
  loadCountyInfo,
  loadStateData,
  getSupportedStates,
  getCountiesForState,
  getEvictionTypes,
  STATE_CONFIG,
  COUNTY_FILES
};
