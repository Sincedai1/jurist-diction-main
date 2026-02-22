/**
 * Tennessee Expungement Packet Generator
 * Generates comprehensive information packets for Tennessee expungement
 *
 * UPL COMPLIANT: This generator produces educational information only.
 * All packets include appropriate disclaimers and recommend attorney consultation.
 */

const fs = require('fs');
const path = require('path');

// Load data files
const statutes = require('../data/expungement/tn/statutes.json');
const procedures = require('../data/expungement/tn/procedures.json');

// Load modules
const disclaimers = require('./disclaimers');
const situationAnalyzer = require('./situation-analyzer');

/**
 * Generate a complete expungement information packet
 * @param {object} options - Packet generation options
 * @returns {object} Generated packet with all components
 */
function generatePacket(options) {
  const {
    situation,
    county,
    outputFormat = 'json'
  } = options;

  // Analyze the situation
  const analysis = situationAnalyzer.analyzeSituation(situation);

  // Load county-specific data
  const countyData = loadCountyData(county);

  // Build the packet
  const packet = {
    metadata: {
      generated: new Date().toISOString(),
      version: '1.0.0',
      jurisdiction: 'Tennessee',
      county: county || 'General',
      packetType: 'expungement'
    },
    disclaimers: {
      header: disclaimers.getExpungementHeader(),
      eligibility: disclaimers.getNotice('eligibility'),
      countySpecific: disclaimers.getNotice('countySpecific'),
      fee: disclaimers.getNotice('feeNotice'),
      timeline: disclaimers.getNotice('timelineNotice'),
      footer: disclaimers.getExpungementFooter()
    },
    analysis: analysis,
    countyInfo: countyData,
    legalInfo: {
      statutes: extractRelevantStatutes(analysis),
      procedures: extractRelevantProcedures(analysis),
      eligibleOffenses: statutes.eligibleOffenses,
      ineligibleOffenses: summarizeIneligibleOffenses()
    },
    forms: getRequiredForms(analysis, countyData),
    timeline: generateDetailedTimeline(analysis, countyData),
    fees: generateFeeSchedule(countyData),
    checklist: generateChecklist(analysis, countyData),
    resources: getResources(countyData)
  };

  return packet;
}

/**
 * Generate packet as formatted text document
 * @param {object} options - Packet generation options
 * @returns {string} Formatted text packet
 */
function generateTextPacket(options) {
  const packet = generatePacket(options);

  let output = '';

  // Header with disclaimers
  output += packet.disclaimers.header;
  output += '\n';

  // Packet information
  output += formatSection('PACKET INFORMATION', [
    `Generated: ${packet.metadata.generated}`,
    `Jurisdiction: ${packet.metadata.jurisdiction}`,
    `County: ${packet.metadata.county}`,
    `Packet Type: Expungement Information`,
    `Version: ${packet.metadata.version}`
  ]);

  // Eligibility assessment
  output += packet.disclaimers.eligibility;
  output += '\n';
  output += formatSection('ELIGIBILITY ASSESSMENT', [
    `Status: ${formatStatus(packet.analysis.eligibility.status)}`,
    `Confidence: ${packet.analysis.eligibility.confidence}`,
    '',
    ...packet.analysis.eligibility.reasons.map(r => `* ${r}`)
  ]);

  if (packet.analysis.eligibility.blockingFactors.length > 0) {
    output += '\n';
    output += formatSection('BLOCKING FACTORS',
      packet.analysis.eligibility.blockingFactors.map(bf =>
        `! ${bf.factor}: ${bf.description}`
      )
    );
  }

  if (packet.analysis.eligibility.requirements.length > 0) {
    output += '\n';
    output += formatSection('REQUIREMENTS TO PROCEED',
      packet.analysis.eligibility.requirements.map((r, i) => `${i + 1}. ${r}`)
    );
  }

  // Waiting period information
  if (packet.analysis.eligibility.waitingPeriod) {
    output += '\n';
    output += formatSection('WAITING PERIOD', [
      `Required: ${packet.analysis.eligibility.waitingPeriod}`,
      `Status: ${packet.analysis.eligibility.waitingPeriodMet ? 'COMPLETE' : 'NOT COMPLETE'}`,
      packet.analysis.timeline.note || ''
    ]);
  }

  // Warnings
  if (packet.analysis.warnings.length > 0) {
    output += '\n';
    output += formatSection('WARNINGS',
      packet.analysis.warnings.map(w =>
        `[${w.severity.toUpperCase()}] ${w.message}\n  ${w.detail}`
      )
    );
  }

  // County-specific procedures
  if (packet.countyInfo) {
    output += packet.disclaimers.countySpecific;
    output += '\n';
    output += formatCountyInformation(packet.countyInfo);
  }

  // Forms
  output += '\n';
  output += formatSection('REQUIRED FORMS',
    packet.forms.required.map(f => `* ${f}`),
    packet.forms.optional ? ['', 'Optional:', ...packet.forms.optional.map(f => `  * ${f}`)] : []
  );

  // Fees
  output += packet.disclaimers.fee;
  output += '\n';
  output += formatSection('FEE SCHEDULE', formatFees(packet.fees));

  // Timeline
  output += packet.disclaimers.timelineNotice;
  output += '\n';
  output += formatSection('TIMELINE ESTIMATE', formatTimeline(packet.timeline));

  // Checklist
  output += '\n';
  output += formatSection('FILING CHECKLIST',
    packet.checklist.map((item, i) =>
      `[ ] ${i + 1}. ${item.task}${item.note ? `\n     Note: ${item.note}` : ''}`
    )
  );

  // Resources
  output += '\n';
  output += formatSection('RESOURCES & LEGAL AID', formatResources(packet.resources));

  // Legal information
  output += '\n';
  output += formatSection('RELEVANT TENNESSEE LAW',
    packet.legalInfo.statutes.map(s =>
      `${s.code}: ${s.description}`
    )
  );

  // What expungement does/doesn't do
  output += '\n';
  output += formatSection('WHAT EXPUNGEMENT DOES',
    statutes.effects.does.map(d => `* ${d}`)
  );
  output += '\n';
  output += formatSection('WHAT EXPUNGEMENT DOES NOT DO',
    statutes.effects.doesNot.map(d => `* ${d}`)
  );

  // Footer
  output += '\n';
  output += packet.disclaimers.footer;
  output += '\n';
  output += disclaimers.getDocumentFooter(packet.metadata.version);

  return output;
}

/**
 * Load county-specific data
 */
function loadCountyData(county) {
  if (!county) return null;

  const countyLower = county.toLowerCase();
  const countyPath = path.join(__dirname, '..', 'data', 'expungement', 'tn', 'counties', `${countyLower}.json`);

  try {
    if (fs.existsSync(countyPath)) {
      return JSON.parse(fs.readFileSync(countyPath, 'utf8'));
    }
  } catch (error) {
    console.error(`Error loading county data for ${county}:`, error.message);
  }

  return null;
}

/**
 * Extract relevant statutes based on analysis
 */
function extractRelevantStatutes(analysis) {
  const relevantStatutes = [];
  const outcome = analysis.input.outcome;

  // Always include the main statute
  relevantStatutes.push({
    code: 'TCA 40-32-101',
    description: 'Expungement of Criminal Records - Primary statute'
  });

  if (outcome === 'dismissed' || outcome === 'acquitted') {
    relevantStatutes.push({
      code: 'TCA 40-32-101(a)(1)',
      description: 'Expungement for dismissed charges and acquittals'
    });
  }

  if (analysis.input.diversionCompleted) {
    relevantStatutes.push({
      code: 'TCA 40-32-101(a)(1)',
      description: 'Expungement for completed diversion programs'
    });
  }

  if (outcome === 'convicted') {
    if (analysis.eligibility.chargeType === 'misdemeanor') {
      relevantStatutes.push({
        code: 'TCA 40-32-101(g)',
        description: 'Expungement for eligible misdemeanor convictions'
      });
    } else {
      relevantStatutes.push({
        code: 'TCA 40-32-101(a)(1)(B)',
        description: 'Expungement for certain non-violent felony convictions'
      });
    }
  }

  return relevantStatutes;
}

/**
 * Extract relevant procedures based on analysis
 */
function extractRelevantProcedures(analysis) {
  if (analysis.procedure) {
    return {
      name: analysis.procedure.name,
      statute: analysis.procedure.statute,
      description: analysis.procedure.description,
      steps: analysis.procedure.process,
      timeline: analysis.procedure.timeline
    };
  }
  return null;
}

/**
 * Summarize ineligible offenses
 */
function summarizeIneligibleOffenses() {
  return {
    felonies: statutes.ineligibleOffenses.felonies,
    misdemeanors: statutes.ineligibleOffenses.misdemeanors,
    note: 'This is not an exhaustive list. Consult an attorney for eligibility determination.'
  };
}

/**
 * Get required forms based on situation and county
 */
function getRequiredForms(analysis, countyData) {
  const forms = {
    required: [...statutes.requiredForms.statewide],
    optional: [...statutes.requiredForms.additionalForms]
  };

  // Add county-specific forms if available
  if (countyData && countyData.forms) {
    if (countyData.forms.requiredForms) {
      countyData.forms.requiredForms.forEach(f => {
        if (!forms.required.includes(f)) {
          forms.required.push(f);
        }
      });
    }
    if (countyData.forms.additionalForms) {
      countyData.forms.additionalForms.forEach(f => {
        if (!forms.optional.includes(f)) {
          forms.optional.push(f);
        }
      });
    }
  }

  forms.whereToGet = countyData?.forms?.whereToObtain ||
    'Available at the court clerk\'s office or the Tennessee Administrative Office of the Courts website';
  forms.onlineUrl = countyData?.forms?.onlineForms || null;

  return forms;
}

/**
 * Generate detailed timeline
 */
function generateDetailedTimeline(analysis, countyData) {
  const timeline = {
    waitingPeriod: analysis.eligibility.waitingPeriod || 'None',
    waitingPeriodMet: analysis.eligibility.waitingPeriodMet,
    processingTime: '30-90 days (typical)',
    daResponsePeriod: '30 days',
    hearingNotice: '2-4 weeks advance notice',
    totalEstimate: '30-90 days after filing (if eligible now)',
    milestones: []
  };

  if (countyData && countyData.timeline) {
    timeline.processingTime = countyData.timeline.processingTime || timeline.processingTime;
    timeline.hearingNotice = countyData.timeline.hearingNotice || timeline.hearingNotice;
  }

  // Add milestones based on procedure
  if (!analysis.eligibility.waitingPeriodMet && analysis.eligibility.waitingPeriod) {
    timeline.milestones.push({
      step: 'Complete waiting period',
      duration: analysis.eligibility.waitingPeriod,
      status: 'pending'
    });
  }

  timeline.milestones.push(
    { step: 'Obtain criminal records', duration: '1-2 weeks', status: 'pending' },
    { step: 'Complete petition forms', duration: '1-3 days', status: 'pending' },
    { step: 'File petition', duration: '1 day', status: 'pending' },
    { step: 'DA review period', duration: '30 days', status: 'pending' },
    { step: 'Court processing', duration: '30-60 days', status: 'pending' },
    { step: 'Receive order', duration: '1-2 weeks', status: 'pending' }
  );

  return timeline;
}

/**
 * Generate fee schedule
 */
function generateFeeSchedule(countyData) {
  const fees = {
    stateFilingFee: 0,
    administrativeFee: 'Varies by county ($0-$50)',
    certificationFee: '$5 per certified copy',
    copyFee: '$0.25-$0.50 per page',
    total: 'Contact court clerk for exact amount'
  };

  if (countyData && countyData.fees) {
    fees.administrativeFee = countyData.fees.administrativeFee;
    fees.certificationFee = countyData.fees.certificationFee || fees.certificationFee;
    fees.copyFee = countyData.fees.copyFee || fees.copyFee;
    fees.countyNotes = countyData.fees.notes;
  }

  return fees;
}

/**
 * Generate filing checklist
 */
function generateChecklist(analysis, countyData) {
  const checklist = [
    { task: 'Obtain certified copies of criminal records', required: true },
    { task: 'Obtain proof of sentence completion', required: true },
    { task: 'Verify all fines and court costs are paid', required: true },
    { task: 'Complete Petition for Expungement form', required: true },
    { task: 'Complete Order of Expungement form', required: true }
  ];

  if (analysis.input.diversionCompleted) {
    checklist.push({ task: 'Obtain Certificate of Diversion Completion', required: true });
  }

  if (analysis.eligibility.status === 'dismissed' || analysis.eligibility.status === 'acquitted') {
    checklist.push({ task: 'Obtain certified copy of dismissal/acquittal order', required: true });
  }

  if (countyData && countyData.procedures && countyData.procedures.daNotification) {
    if (countyData.procedures.daNotification.includes('must serve')) {
      checklist.push({ task: 'Serve copy of petition on District Attorney', required: true });
      checklist.push({ task: 'Obtain proof of service to DA', required: true });
    }
  }

  checklist.push(
    { task: 'Make copies of all documents for your records', required: false, note: 'Keep at least 2 copies' },
    { task: 'File documents with court clerk', required: true },
    { task: 'Pay any required administrative fees', required: true },
    { task: 'Obtain file-stamped copies of filed documents', required: true }
  );

  return checklist;
}

/**
 * Get resources for the county
 */
function getResources(countyData) {
  const resources = {
    legalAid: [],
    selfHelp: null,
    onlineResources: [
      {
        name: 'Tennessee Administrative Office of the Courts',
        url: 'https://www.tncourts.gov'
      },
      {
        name: 'Tennessee Free Legal Answers',
        url: 'https://tn.freelegalanswers.org'
      }
    ]
  };

  if (countyData && countyData.resources) {
    resources.legalAid = countyData.resources.legalAid || [];
    resources.selfHelp = countyData.resources.selfHelp || null;
  }

  if (countyData && countyData.specialPrograms) {
    resources.specialPrograms = countyData.specialPrograms;
  }

  return resources;
}

/**
 * Format a section with title and content
 */
function formatSection(title, lines, additionalLines = []) {
  let output = '';
  const separator = '='.repeat(80);

  output += separator + '\n';
  output += title.toUpperCase() + '\n';
  output += separator + '\n\n';

  if (Array.isArray(lines)) {
    lines.forEach(line => {
      output += line + '\n';
    });
  } else {
    output += lines + '\n';
  }

  if (additionalLines.length > 0) {
    additionalLines.forEach(line => {
      output += line + '\n';
    });
  }

  output += '\n';
  return output;
}

/**
 * Format status with color indicators (text version)
 */
function formatStatus(status) {
  const statusMap = {
    'eligible': 'ELIGIBLE',
    'ineligible': 'INELIGIBLE',
    'pending': 'PENDING - Additional requirements',
    'unknown': 'UNKNOWN - Verification required'
  };
  return statusMap[status] || status.toUpperCase();
}

/**
 * Format county information
 */
function formatCountyInformation(countyData) {
  let output = '';

  output += formatSection('COUNTY COURT INFORMATION', [
    `County: ${countyData.county}`,
    `County Seat: ${countyData.countySeat}`,
    `Judicial District: ${countyData.judicialDistrict}`,
    '',
    'CRIMINAL COURT:',
    `  Name: ${countyData.courtInformation.criminalCourt.name}`,
    `  Address: ${countyData.courtInformation.criminalCourt.address}`,
    `           ${countyData.courtInformation.criminalCourt.city}, ${countyData.courtInformation.criminalCourt.state} ${countyData.courtInformation.criminalCourt.zip}`,
    `  Phone: ${countyData.courtInformation.criminalCourt.phone}`,
    `  Hours: ${countyData.courtInformation.criminalCourt.hours}`,
    '',
    'CLERK INFORMATION:',
    `  Name: ${countyData.clerkInformation.name}`,
    `  Address: ${countyData.clerkInformation.address}`,
    `           ${countyData.clerkInformation.city}, ${countyData.clerkInformation.state} ${countyData.clerkInformation.zip}`,
    `  Phone: ${countyData.clerkInformation.phone}`
  ]);

  output += formatSection('FILING PROCEDURES', [
    `Filing Location: ${countyData.procedures.filingLocation}`,
    `Hours: ${countyData.procedures.hoursForFiling}`,
    `DA Notification: ${countyData.procedures.daNotification}`,
    `Hearing Required: ${countyData.procedures.hearingRequired}`,
    '',
    ...countyData.procedures.specialNotes.map(note => `* ${note}`)
  ]);

  return output;
}

/**
 * Format fees for display
 */
function formatFees(fees) {
  return [
    `State Filing Fee: ${typeof fees.stateFilingFee === 'number' ? '$' + fees.stateFilingFee : fees.stateFilingFee}`,
    `Administrative Fee: ${fees.administrativeFee}`,
    `Certification Fee: ${fees.certificationFee}`,
    `Copy Fee: ${fees.copyFee}`,
    fees.countyNotes ? `\nNote: ${fees.countyNotes}` : ''
  ].filter(Boolean);
}

/**
 * Format timeline for display
 */
function formatTimeline(timeline) {
  const lines = [];

  if (!timeline.waitingPeriodMet && timeline.waitingPeriod !== 'None') {
    lines.push(`Waiting Period Required: ${timeline.waitingPeriod} (NOT COMPLETE)`);
  } else {
    lines.push(`Waiting Period: ${timeline.waitingPeriod || 'None'}`);
  }

  lines.push(`Processing Time: ${timeline.processingTime}`);
  lines.push(`Total Estimate: ${timeline.totalEstimate}`);
  lines.push('');
  lines.push('MILESTONES:');

  timeline.milestones.forEach(m => {
    lines.push(`  * ${m.step}: ${m.duration}`);
  });

  return lines;
}

/**
 * Format resources for display
 */
function formatResources(resources) {
  const lines = [];

  if (resources.legalAid && resources.legalAid.length > 0) {
    lines.push('LEGAL AID ORGANIZATIONS:');
    resources.legalAid.forEach(org => {
      lines.push(`  * ${org.name}`);
      lines.push(`    Address: ${org.address}, ${org.city}`);
      lines.push(`    Phone: ${org.phone}`);
      if (org.website) {
        lines.push(`    Website: ${org.website}`);
      }
      lines.push('');
    });
  }

  if (resources.selfHelp) {
    lines.push('SELF-HELP CENTER:');
    lines.push(`  Name: ${resources.selfHelp.name}`);
    lines.push(`  Location: ${resources.selfHelp.location}`);
    lines.push(`  Hours: ${resources.selfHelp.hours}`);
    lines.push(`  Services: ${resources.selfHelp.services}`);
    lines.push('');
  }

  if (resources.onlineResources) {
    lines.push('ONLINE RESOURCES:');
    resources.onlineResources.forEach(r => {
      lines.push(`  * ${r.name}: ${r.url}`);
    });
  }

  return lines;
}

/**
 * Generate PDF-ready packet (returns data structure for PDF generation)
 */
function generatePDFReadyPacket(options) {
  const packet = generatePacket(options);

  return {
    title: 'Tennessee Expungement Information Packet',
    subtitle: `${packet.metadata.county} County`,
    sections: [
      {
        title: 'Important Disclaimers',
        content: packet.disclaimers.header + '\n' + disclaimers.getUPLWarnings()
      },
      {
        title: 'Eligibility Assessment',
        content: formatEligibilityContent(packet.analysis)
      },
      {
        title: 'County Procedures',
        content: packet.countyInfo ? formatCountyInformation(packet.countyInfo) : 'General Tennessee procedures apply'
      },
      {
        title: 'Required Forms',
        content: formatFormsContent(packet.forms)
      },
      {
        title: 'Fee Schedule',
        content: formatFeesContent(packet.fees)
      },
      {
        title: 'Timeline',
        content: formatTimelineContent(packet.timeline)
      },
      {
        title: 'Filing Checklist',
        content: formatChecklistContent(packet.checklist)
      },
      {
        title: 'Resources',
        content: formatResourcesContent(packet.resources)
      }
    ],
    footer: packet.disclaimers.footer + disclaimers.getDocumentFooter(packet.metadata.version)
  };
}

// Helper functions for PDF content formatting
function formatEligibilityContent(analysis) {
  return `Status: ${formatStatus(analysis.eligibility.status)}
Confidence Level: ${analysis.eligibility.confidence}

Reasons:
${analysis.eligibility.reasons.map(r => `- ${r}`).join('\n')}

${analysis.eligibility.requirements.length > 0 ? 'Requirements:\n' + analysis.eligibility.requirements.map(r => `- ${r}`).join('\n') : ''}`;
}

function formatFormsContent(forms) {
  return `Required Forms:
${forms.required.map(f => `- ${f}`).join('\n')}

${forms.optional.length > 0 ? 'Optional Forms:\n' + forms.optional.map(f => `- ${f}`).join('\n') : ''}

Where to obtain: ${forms.whereToGet}`;
}

function formatFeesContent(fees) {
  return `State Filing Fee: $${fees.stateFilingFee}
Administrative Fee: ${fees.administrativeFee}
Certification Fee: ${fees.certificationFee}
Copy Fee: ${fees.copyFee}
${fees.countyNotes ? '\nNote: ' + fees.countyNotes : ''}`;
}

function formatTimelineContent(timeline) {
  return `Waiting Period: ${timeline.waitingPeriod}
Processing Time: ${timeline.processingTime}
Total Estimate: ${timeline.totalEstimate}

Milestones:
${timeline.milestones.map(m => `- ${m.step}: ${m.duration}`).join('\n')}`;
}

function formatChecklistContent(checklist) {
  return checklist.map((item, i) =>
    `[ ] ${i + 1}. ${item.task}${item.required ? ' (Required)' : ' (Optional)'}${item.note ? '\n    Note: ' + item.note : ''}`
  ).join('\n');
}

function formatResourcesContent(resources) {
  let content = '';

  if (resources.legalAid && resources.legalAid.length > 0) {
    content += 'Legal Aid:\n';
    resources.legalAid.forEach(org => {
      content += `- ${org.name}: ${org.phone}\n`;
    });
  }

  if (resources.onlineResources) {
    content += '\nOnline Resources:\n';
    resources.onlineResources.forEach(r => {
      content += `- ${r.name}: ${r.url}\n`;
    });
  }

  return content;
}

module.exports = {
  generatePacket,
  generateTextPacket,
  generatePDFReadyPacket,
  loadCountyData,
  extractRelevantStatutes,
  extractRelevantProcedures,
  getRequiredForms,
  generateDetailedTimeline,
  generateFeeSchedule,
  generateChecklist,
  getResources
};
