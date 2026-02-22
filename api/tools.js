/**
 * Legal Tools API
 * Vercel serverless function for legal document processing tools
 */

const documentParser = require('../tools/document-parser');
const auditor = require('../tools/auditor');
const simplifier = require('../tools/simplifier');
const whitepaperGenerator = require('../tools/whitepaper-generator');

/**
 * Main API handler
 */
export default function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, data } = req.body;

  try {
    switch (action) {
      case 'parse':
        return handleParse(req, res);
      case 'audit':
        return handleAudit(req, res);
      case 'simplify':
        return handleSimplify(req, res);
      case 'generate-whitepaper':
        return handleWhitepaper(req, res);
      case 'process-document':
        return handleProcessDocument(req, res);
      default:
        return res.status(400).json({ error: 'Unknown action' });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Handle document parsing
 */
function handleParse(req, res) {
  const { content, documentType } = req.body.data;

  if (!content) {
    return res.status(400).json({ error: 'Document content is required' });
  }

  const parsed = documentParser.parseFromText(content, documentType);

  return res.status(200).json({
    success: true,
    data: parsed
  });
}

/**
 * Handle document auditing
 */
function handleAudit(req, res) {
  const { parsedDocument } = req.body.data;

  if (!parsedDocument) {
    return res.status(400).json({ error: 'Parsed document is required' });
  }

  const audit = auditor.auditDocument(parsedDocument);

  return res.status(200).json({
    success: true,
    data: audit
  });
}

/**
 * Handle text simplification
 */
function handleSimplify(req, res) {
  const { content, documentType } = req.body.data;

  if (!content) {
    return res.status(400).json({ error: 'Content is required' });
  }

  const simplified = simplifier.simplifyText(content, documentType);

  return res.status(200).json({
    success: true,
    data: simplified
  });
}

/**
 * Handle whitepaper generation
 */
function handleWhitepaper(req, res) {
  const { topic, usageData, marketData } = req.body.data;

  if (!topic) {
    return res.status(400).json({ error: 'Topic is required' });
  }

  const whitepaper = whitepaperGenerator.generateWhitepaper(
    topic,
    usageData || {},
    marketData || {}
  );

  // Also generate markdown version
  const markdown = whitepaperGenerator.generateMarkdown(whitepaper);

  return res.status(200).json({
    success: true,
    data: {
      json: whitepaper,
      markdown: markdown
    }
  });
}

/**
 * Handle complete document processing
 * Parses → Audits → Simplifies in one call
 */
function handleProcessDocument(req, res) {
  const { content, documentType } = req.body.data;

  if (!content) {
    return res.status(400).json({ error: 'Document content is required' });
  }

  // Step 1: Parse
  const parsed = documentParser.parseFromText(content, documentType);

  // Step 2: Audit
  const audit = auditor.auditDocument(parsed);

  // Step 3: Simplify summary
  const simplified = simplifier.simplifyText(content, documentType);

  return res.status(200).json({
    success: true,
    data: {
      parsed: parsed,
      audit: audit,
      simplified: simplified,
      summary: generateDocumentSummary(parsed, audit, simplified)
    }
  });
}

/**
 * Generate comprehensive document summary
 */
function generateDocumentSummary(parsed, audit, simplified) {
  return {
    title: parsed.metadata.title,
    documentType: parsed.metadata.documentType,
    overallScore: audit.overallScore,
    riskLevel: audit.riskScore > 70 ? 'High' : audit.riskScore > 40 ? 'Medium' : 'Low',
    keyPoints: parsed.summary.keyPoints,
    importantDates: parsed.dates.allDates.slice(0, 5),
    deadlines: parsed.deadlines,
    parties: parsed.parties,
    topRisks: audit.risks.high.slice(0, 3),
    topRecommendations: audit.recommendations.slice(0, 5),
    plainEnglishSummary: simplified.whatItMeans
  };
}
