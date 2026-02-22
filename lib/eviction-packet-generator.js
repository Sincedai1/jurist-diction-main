/**
 * Tennessee Eviction Defense Packet Generator
 * Generates comprehensive eviction defense packets for Tennessee tenants
 *
 * UPL COMPLIANT: Generates informational packets only, not legal advice.
 */

const fs = require('fs');
const path = require('path');

// Load dependencies
const statutesData = require('../data/eviction-defense/tn/statutes.json');
const proceduresData = require('../data/eviction-defense/tn/procedures.json');
const { analyzeSituation } = require('./eviction-situation-analyzer');
const {
  getEvictionDefenseDisclaimer,
  getShortDisclaimer,
  getDeadlineWarning,
  formatDisclaimerPlainText,
  getDocumentFooter
} = require('./eviction-disclaimers');

/**
 * Generate a complete eviction defense packet
 * @param {object} situationData - Tenant's situation data
 * @returns {object} Generated packet data
 */
function generatePacket(situationData) {
  const packet = {
    metadata: {
      generatedAt: new Date().toISOString(),
      version: '1.0.0',
      jurisdiction: 'Tennessee',
      packetType: 'eviction-defense'
    },
    disclaimer: getEvictionDefenseDisclaimer(),
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
  packet.situationAnalysis = analyzeSituation(situationData);
  packet.evictionType = packet.situationAnalysis.evictionType;
  packet.timelineAnalysis = packet.situationAnalysis.timelineAnalysis;
  packet.defenses = packet.situationAnalysis.recommendedDefenses;
  packet.resources = packet.situationAnalysis.resources;

  // Load county-specific information
  packet.countyInfo = loadCountyInfo(situationData.county);

  // Generate the document content
  packet.documentContent = generateDocumentContent(packet, situationData);

  return packet;
}

/**
 * Load county-specific information
 * @param {string} county - County name
 * @returns {object} County information
 */
function loadCountyInfo(county) {
  if (!county) return null;

  const countyLower = county.toLowerCase();
  const countyFiles = {
    davidson: 'davidson.json',
    shelby: 'shelby.json',
    knox: 'knox.json'
  };

  const countyFile = countyFiles[countyLower];
  if (!countyFile) return null;

  try {
    const countyPath = path.join(__dirname, '..', 'data', 'eviction-defense', 'tn', 'counties', countyFile);
    const countyData = JSON.parse(fs.readFileSync(countyPath, 'utf8'));
    return countyData;
  } catch (error) {
    console.error(`Error loading county data for ${county}:`, error.message);
    return null;
  }
}

/**
 * Generate the document content (text/markdown)
 * @param {object} packet - Packet data
 * @param {object} situationData - Original situation data
 * @returns {object} Document content in various formats
 */
function generateDocumentContent(packet, situationData) {
  const content = {
    markdown: generateMarkdownContent(packet, situationData),
    plainText: null,
    summary: null
  };

  // Generate plain text from markdown
  content.plainText = markdownToPlainText(content.markdown);

  // Generate summary
  content.summary = generateSummary(packet, situationData);

  return content;
}

/**
 * Generate markdown content for the packet
 */
function generateMarkdownContent(packet, situationData) {
  const sections = [];
  const county = situationData.county ? situationData.county.charAt(0).toUpperCase() + situationData.county.slice(1).toLowerCase() : 'Unknown';

  // Title and Disclaimer
  sections.push(`# TENNESSEE EVICTION DEFENSE PACKET
## ${county} County

*Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}*

---

## IMPORTANT DISCLAIMER

${getEvictionDefenseDisclaimer()}

---

## YOUR SITUATION ANALYSIS

### Eviction Type Identified
**${packet.evictionType.displayName}**

${packet.evictionType.description}

**Required Notice Period:** ${packet.evictionType.noticeRequired} days

### Urgency Level: ${packet.situationAnalysis.urgencyLevel.toUpperCase()}

${packet.situationAnalysis.urgencyLevel === 'critical' ? '**IMMEDIATE ACTION REQUIRED** - Critical deadlines approaching!' :
  packet.situationAnalysis.urgencyLevel === 'urgent' ? '**URGENT** - Court date is approaching' :
  packet.situationAnalysis.urgencyLevel === 'elevated' ? '**ELEVATED** - Court date within 2 weeks' :
  'Standard timeline - prepare your defense'}

---

## DEADLINE WARNING

${getDeadlineWarning()}

---
`);

  // Timeline Analysis Section
  if (packet.timelineAnalysis.issues.length > 0) {
    sections.push(`## TIMELINE ISSUES IDENTIFIED

The following timeline issues were identified that may affect your case:

| Issue | Severity | Details |
|-------|----------|---------|
${packet.timelineAnalysis.issues.map(issue => `| ${issue.type.replace(/_/g, ' ').toUpperCase()} | ${issue.severity.toUpperCase()} | ${issue.message} |`).join('\n')}

---
`);
  }

  // Defenses Section
  sections.push(`## YOUR POTENTIAL DEFENSES

Based on your situation, the following defenses may apply:

`);

  packet.defenses.forEach((defense, index) => {
    const strengthEmoji = defense.strength === 'strong' ? '[STRONG]' :
                         defense.strength === 'moderate' ? '[MODERATE]' : '[POTENTIAL]';

    sections.push(`### ${index + 1}. ${defense.name} ${strengthEmoji}

${defense.description}
${defense.citation ? `\n*Legal Citation: ${defense.citation}*` : ''}

**Evidence/Documentation Needed:**
${defense.documentation ? defense.documentation.map(doc => `- ${doc}`).join('\n') :
  (defense.checklist || []).map(item => `- ${item}`).join('\n')}

${defense.caveat ? `\n*Note: ${defense.caveat}*` : ''}

---
`);
  });

  // Next Steps Section
  sections.push(`## RECOMMENDED NEXT STEPS

Follow these steps in order of priority:

| Priority | Action | Deadline | Details |
|----------|--------|----------|---------|
${packet.situationAnalysis.nextSteps.map(step => `| ${step.priority.toUpperCase()} | ${step.action} | ${step.deadline || 'N/A'} | ${step.details} |`).join('\n')}

---

## COURT PROCEDURES

### General Sessions Court Process

1. **Detainer Warrant Filed** - Landlord files with Court Clerk
2. **Service of Process** - You receive the warrant (sheriff or certified mail)
3. **Court Hearing** - Typically 6-10 days after filing
4. **Judgment** - Judge rules for landlord or tenant
5. **Appeal Period** - 10 calendar days to appeal if judgment against you
6. **Writ of Possession** - If no appeal, writ issued to sheriff
7. **Physical Eviction** - Sheriff removes tenant (24-72 hours after writ)

### Appearing in Court

- Arrive at least 30 minutes early
- Dress appropriately (business casual)
- Bring all documentation organized chronologically
- Be prepared to present your defense concisely
- Address the judge as "Your Honor"

---

`);

  // County-Specific Information
  if (packet.countyInfo) {
    sections.push(`## ${county.toUpperCase()} COUNTY SPECIFIC INFORMATION

### Court Location
**${packet.countyInfo.court.name}**
${packet.countyInfo.court.address}
Phone: ${packet.countyInfo.court.phone}
Website: ${packet.countyInfo.court.website}

### Filing Information
- Detainer Warrant Filing Fee: ${packet.countyInfo.filingProcedures?.detainerWarrant?.filingFee || 'Contact court for current fees'}
- Court Hours: ${packet.countyInfo.court.hours}

### Hearing Schedule
${packet.countyInfo.hearingProcedures?.schedule ?
  `Days: ${packet.countyInfo.hearingProcedures.schedule.days?.join(', ') || 'Contact court'}
Times: ${packet.countyInfo.hearingProcedures.schedule.times || 'Contact court'}` :
  'Contact the court for current hearing schedule'}

### Legal Aid Resources

**${packet.countyInfo.legalAidResources?.[0]?.name || 'Local Legal Aid'}**
${packet.countyInfo.legalAidResources?.[0]?.address || ''}
Phone: ${packet.countyInfo.legalAidResources?.[0]?.phone || ''}
${packet.countyInfo.legalAidResources?.[0]?.website ? `Website: ${packet.countyInfo.legalAidResources[0].website}` : ''}

### Special Notes
${(packet.countyInfo.specialNotes || []).map(note => `- ${note}`).join('\n')}

---
`);
  }

  // Tennessee Statutes Reference
  sections.push(`## KEY TENNESSEE STATUTES

### Uniform Residential Landlord and Tenant Act (URLTA)
*Applies in counties with population over 75,000*

| Statute | Subject | Summary |
|---------|---------|---------|
| TCA 66-28-201 | Landlord Obligations | Must maintain habitable premises |
| TCA 66-28-502 | Nonpayment Eviction | 14-day notice required |
| TCA 66-28-503 | Lease Violation | 30-day notice required |
| TCA 66-28-512 | Self-Help Prohibition | Illegal for landlord to change locks, shut off utilities |
| TCA 66-28-411 | Retaliatory Eviction | Cannot evict for exercising legal rights |

### Notice Periods

| Eviction Reason | Notice Required |
|-----------------|-----------------|
| Non-payment of rent | 14 days |
| Lease violation | 30 days |
| Holdover tenant | 30 days |
| Illegal activity | 3 days |

---

## SELF-HELP EVICTION IS ILLEGAL

Your landlord CANNOT legally:
- Change your locks
- Remove your doors or windows
- Shut off your water, electricity, or gas
- Remove your belongings
- Threaten or harass you

If your landlord has done any of these, you may have a claim for damages.

**Citation:** TCA 66-28-512

---

## ADDITIONAL RESOURCES

### Statewide Legal Aid
**${statutesData.resources.legalAid.statewide.name}**
Phone: ${statutesData.resources.legalAid.statewide.phone}
Website: ${statutesData.resources.legalAid.statewide.website}

### Emergency Assistance
- Dial 2-1-1 for local resources
- Contact your county's Community Action Agency
- Ask the court about rental assistance programs

---

`);

  // Footer
  sections.push(getDocumentFooter('1.0.0'));

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
    nextStep: packet.situationAnalysis.nextSteps.length > 0 ? packet.situationAnalysis.nextSteps[0].action : 'Consult legal aid',
    timelineIssues: packet.timelineAnalysis.issues.length,
    county: situationData.county || 'Unknown',
    courtDate: situationData.courtDate || 'Not provided'
  };
}

/**
 * Convert markdown to plain text
 */
function markdownToPlainText(markdown) {
  return markdown
    .replace(/^#{1,6}\s+/gm, '') // Remove headers
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
    .replace(/\*([^*]+)\*/g, '$1') // Remove italic
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
    .replace(/^[-*]\s+/gm, '  - ') // Indent list items
    .replace(/\|/g, ' | ') // Pad table separators
    .replace(/[-]{3,}/g, '--------------------------------------------------------------------------------') // Expand dividers
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
  return {
    filename: `tn-eviction-defense-${Date.now()}.txt`,
    content: packet.documentContent.plainText,
    mimeType: 'text/plain'
  };
}

/**
 * Generate packet as markdown
 */
function generatePacketMarkdown(situationData) {
  const packet = generatePacket(situationData);
  return {
    filename: `tn-eviction-defense-${Date.now()}.md`,
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
  loadCountyInfo
};
