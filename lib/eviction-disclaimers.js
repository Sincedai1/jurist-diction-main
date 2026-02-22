/**
 * UPL Compliance Disclaimers Module for Eviction Defense
 * Provides required disclaimers for all legal information tools
 */

const EVICTION_DISCLAIMERS = {
  standard: `
IMPORTANT DISCLAIMER: This is NOT legal advice.

This information is provided for educational and informational purposes only. It does not constitute legal advice, and no attorney-client relationship is created by your use of this information.

The information contained herein may not apply to your specific situation. Laws vary by jurisdiction and change frequently. You should not act or rely on any information contained herein without seeking the advice of a licensed attorney.

If you need legal advice, please consult with a qualified attorney licensed to practice in your jurisdiction.

This tool was created to help you understand your rights and options, not to provide specific legal guidance for your case.
`.trim(),

  eviction: `
EVICTION DEFENSE DISCLAIMER

This eviction defense packet provides general information about Tennessee landlord-tenant law and court procedures. This is NOT legal advice for your specific situation.

IMPORTANT:
- Every eviction case is unique and has specific facts that may affect your rights
- The information here may not cover all defenses available to you
- Landlord-tenant law is complex and subject to change
- Court procedures vary by county and judge
- You may have rights or defenses not discussed in this packet

IF YOU ARE FACING EVICTION:
1. Contact a licensed attorney immediately if possible
2. Contact your local legal aid organization for free legal assistance
3. Attend all court hearings - failure to appear usually results in eviction
4. This packet is a starting point, not a complete legal defense

DO NOT rely solely on this information. Seek qualified legal counsel for advice specific to your situation.
`.trim(),

  tennessee: `
TENNESSEE-SPECIFIC DISCLAIMER

This information is specific to Tennessee law, primarily the Uniform Residential Landlord and Tenant Act (URLTA), which applies in counties with populations over 75,000.

If you live in a county where URLTA does not apply (population under 75,000), different laws and procedures may apply.

The statutes and procedures referenced are based on Tennessee Code Annotated (TCA) and local court rules as of the date of this document. Laws and court procedures change frequently.

ALWAYS verify current procedures with:
- Your local General Sessions Court
- A Tennessee-licensed attorney
- Your local legal aid organization
`.trim(),

  deadline: `
DEADLINE WARNING

Eviction cases have strict deadlines that can result in losing your rights if missed:

- 10 DAYS to appeal a General Sessions Court judgment
- Court hearing date MUST be attended
- Notice response periods (14 or 30 days) must be calculated correctly

Missing a deadline can result in immediate eviction with no further recourse.

Set calendar reminders and do not delay in taking action on your case.
`.trim(),

  selfRepresentation: `
SELF-REPRESENTATION NOTICE

If you are representing yourself in court (pro se), you are held to the same standards as an attorney. This means:
- You must follow all court rules and procedures
- You must file documents correctly and on time
- You must present your case properly at hearings
- You are responsible for knowing and asserting your rights

Self-representation carries significant risks. Whenever possible, seek assistance from:
- Legal aid organizations (free for income-qualified tenants)
- Attorney consultation (even a one-time consultation can help)
- Tenant rights organizations
`.trim(),

  short: "This information is for educational purposes only and does not constitute legal advice. Consult a licensed attorney for advice specific to your situation."
};

/**
 * Get combined disclaimer for eviction defense packets
 * @returns {string} Full disclaimer text
 */
function getEvictionDefenseDisclaimer() {
  return [
    EVICTION_DISCLAIMERS.standard,
    '\n\n---\n\n',
    EVICTION_DISCLAIMERS.eviction,
    '\n\n---\n\n',
    EVICTION_DISCLAIMERS.tennessee,
    '\n\n---\n\n',
    EVICTION_DISCLAIMERS.deadline,
    '\n\n---\n\n',
    EVICTION_DISCLAIMERS.selfRepresentation
  ].join('');
}

/**
 * Get standard UPL disclaimer
 * @returns {string} Standard disclaimer text
 */
function getStandardDisclaimer() {
  return EVICTION_DISCLAIMERS.standard;
}

/**
 * Get short footer disclaimer
 * @returns {string} Short disclaimer for footers
 */
function getShortDisclaimer() {
  return EVICTION_DISCLAIMERS.short;
}

/**
 * Get deadline warning
 * @returns {string} Deadline warning text
 */
function getDeadlineWarning() {
  return EVICTION_DISCLAIMERS.deadline;
}

/**
 * Format disclaimer for plain text output
 * @param {string} disclaimer - Disclaimer text
 * @returns {string} Formatted disclaimer
 */
function formatDisclaimerPlainText(disclaimer) {
  return `
================================================================================
                           IMPORTANT LEGAL DISCLAIMER
================================================================================

${disclaimer}

================================================================================
`;
}

/**
 * Format disclaimer as HTML
 * @param {string} disclaimer - Plain text disclaimer
 * @returns {string} HTML formatted disclaimer
 */
function formatDisclaimerAsHtml(disclaimer) {
  return `
    <div class="disclaimer-box" style="background-color: #fff3cd; border: 2px solid #ffc107; padding: 20px; margin: 20px 0; border-radius: 5px;">
      <h3 style="margin-top: 0; color: #856404;">IMPORTANT DISCLAIMER</h3>
      <div style="white-space: pre-wrap; color: #856404;">${disclaimer}</div>
    </div>
  `;
}

/**
 * Get document footer with generation info
 * @param {string} version - Packet version
 * @returns {string} Formatted footer
 */
function getDocumentFooter(version = '1.0.0') {
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return `
================================================================================
Generated: ${date}
Packet Version: ${version}
Jurist Diction - Tennessee Eviction Defense Packet
https://juristdiction.com
================================================================================

${EVICTION_DISCLAIMERS.short}
`;
}

module.exports = {
  EVICTION_DISCLAIMERS,
  getEvictionDefenseDisclaimer,
  getStandardDisclaimer,
  getShortDisclaimer,
  getDeadlineWarning,
  formatDisclaimerPlainText,
  formatDisclaimerAsHtml,
  getDocumentFooter
};
