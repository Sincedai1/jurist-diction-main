/**
 * UPL Compliance - Disclaimers Module
 * Provides standardized disclaimers to ensure Unauthorized Practice of Law compliance
 *
 * IMPORTANT: This module ensures all generated content includes appropriate disclaimers
 * that clarify the information is educational and does not constitute legal advice.
 */

const DISCLAIMERS = {
  general: {
    short: "This information is for educational purposes only and does not constitute legal advice.",
    standard: "This information is provided for educational and informational purposes only. It does not constitute legal advice and should not be relied upon as such. You should consult with a licensed attorney for advice regarding your individual situation.",
    full: `IMPORTANT DISCLAIMER

This document and all information contained herein is provided for educational and informational purposes only. Nothing in this document should be construed as legal advice or as creating an attorney-client relationship.

YOU SHOULD NOT ACT OR RELY ON ANY INFORMATION IN THIS DOCUMENT WITHOUT SEEKING THE ADVICE OF AN INDEPENDENT ATTORNEY LICENSED IN YOUR JURISDICTION.

While every effort has been made to ensure the accuracy of this information, laws and procedures change frequently and vary by jurisdiction. The information provided may not apply to your specific circumstances.

If you need legal advice, please consult with a qualified attorney who is licensed to practice law in your jurisdiction.`
  },

  expungement: {
    header: `
================================================================================
                        TENNESSEE EXPUNGEMENT INFORMATION PACKET
================================================================================

IMPORTANT: This packet contains general information about the expungement process
in Tennessee. It is NOT legal advice. The information may not apply to your
specific situation. You should consult with a licensed Tennessee attorney for
advice about your case.

================================================================================
`,
    footer: `
================================================================================
                              END OF INFORMATION PACKET
================================================================================

REMEMBER: This information is educational only. Every case is different. Laws
change. Consult a licensed attorney for advice specific to your situation.

If you cannot afford an attorney, contact:
  - Legal Aid Society in your area
  - Your local bar association's lawyer referral service
  - Tennessee Free Legal Answers (online)

================================================================================
`,
    eligibility: `
ELIGIBILITY NOTICE: The eligibility assessment provided in this document is
based on general Tennessee law and the information you provided. This is NOT
a guarantee that you qualify for expungement. Only a court can grant an
expungement, and the District Attorney may object to your petition.

Factors that may affect your eligibility include:
  - Specific details of your case not captured in this assessment
  - Changes in the law since your conviction
  - Pending charges or new convictions
  - Court interpretation of eligibility requirements

Please verify your eligibility with the court clerk or an attorney before filing.
`,
    countySpecific: `
COUNTY PROCEDURES NOTICE: Court procedures vary by county in Tennessee. The
information in this packet is specific to the county you selected. If your
case was in a different county, the procedures, fees, and requirements may
be different. Always verify procedures with the local court clerk.

Some counties may have:
  - Different filing locations
  - Different administrative fees
  - Different notification requirements
  - Different hearing procedures
  - Self-help resources or legal clinics
`,
    feeNotice: `
FEE NOTICE: While Tennessee has eliminated the state expungement filing fee,
some counties may still charge administrative processing fees. Fee information
in this packet is current as of the date shown but may change. Contact the
court clerk to verify current fees before filing.

If you cannot afford the administrative fees, you may request a fee waiver
by filing an Affidavit of Indigency with the court.
`,
    timelineNotice: `
TIMELINE NOTICE: The timeline estimates provided are general estimates only.
Your actual processing time may vary based on:
  - Court backlog
  - Whether the District Attorney objects
  - Completeness of your paperwork
  - Whether a hearing is required
  - Staff availability

Do not make important decisions based on these timeline estimates alone.
`
  },

  upl: {
    whatThisIsNot: [
      "This is not legal advice",
      "This does not create an attorney-client relationship",
      "This is not a substitute for consulting with a licensed attorney",
      "This does not guarantee any particular outcome",
      "This may not reflect the most current law or procedures"
    ],
    whatWeRecommend: [
      "Consult with a licensed attorney before taking legal action",
      "Verify all information with the appropriate court",
      "Check that all forms are current before filing",
      "Confirm fee amounts with the court clerk",
      "Seek professional help for complex cases"
    ],
    limitations: [
      "Information may not apply to your specific circumstances",
      "Laws and procedures change frequently",
      "Court practices vary by judge and jurisdiction",
      "This tool cannot account for all possible legal issues",
      "This tool cannot represent you in court"
    ]
  },

  footer: {
    generated: "This document was generated automatically on",
    version: "Packet Version:",
    contact: "For updates or corrections, visit: juristdiction.com"
  }
};

/**
 * Generate a formatted disclaimer for a specific context
 * @param {string} type - Type of disclaimer (general, expungement, upl)
 * @param {string} length - Length of disclaimer (short, standard, full)
 * @returns {string} Formatted disclaimer text
 */
function getDisclaimer(type = 'general', length = 'standard') {
  if (type === 'expungement') {
    return DISCLAIMERS.expungement.header + '\n' +
           DISCLAIMERS.general[length] + '\n';
  }

  if (DISCLAIMERS[type] && DISCLAIMERS[type][length]) {
    return DISCLAIMERS[type][length];
  }

  return DISCLAIMERS.general[length];
}

/**
 * Get the expungement packet header with disclaimers
 * @returns {string} Formatted header
 */
function getExpungementHeader() {
  return DISCLAIMERS.expungement.header;
}

/**
 * Get the expungement packet footer
 * @returns {string} Formatted footer
 */
function getExpungementFooter() {
  return DISCLAIMERS.expungement.footer;
}

/**
 * Get specific notice by type
 * @param {string} noticeType - Type of notice (eligibility, countySpecific, feeNotice, timelineNotice)
 * @returns {string} Formatted notice
 */
function getNotice(noticeType) {
  return DISCLAIMERS.expungement[noticeType] || '';
}

/**
 * Get all UPL warnings as a formatted list
 * @returns {string} Formatted UPL warnings
 */
function getUPLWarnings() {
  let output = '\nWHAT THIS IS NOT:\n';
  output += '-'.repeat(40) + '\n';
  DISCLAIMERS.upl.whatThisIsNot.forEach(item => {
    output += `  * ${item}\n`;
  });

  output += '\nWHAT WE RECOMMEND:\n';
  output += '-'.repeat(40) + '\n';
  DISCLAIMERS.upl.whatWeRecommend.forEach(item => {
    output += `  * ${item}\n`;
  });

  output += '\nLIMITATIONS:\n';
  output += '-'.repeat(40) + '\n';
  DISCLAIMERS.upl.limitations.forEach(item => {
    output += `  * ${item}\n`;
  });

  return output;
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
${'='.repeat(80)}
Generated: ${date}
${DISCLAIMERS.footer.version} ${version}
${DISCLAIMERS.footer.contact}
${'='.repeat(80)}
`;
}

module.exports = {
  DISCLAIMERS,
  getDisclaimer,
  getExpungementHeader,
  getExpungementFooter,
  getNotice,
  getUPLWarnings,
  getDocumentFooter
};
