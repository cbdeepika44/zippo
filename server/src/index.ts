
import express from "express";
import {
  scanDocument,
  validatePrivacy,
  processForAI,
} from "./privacy";
import { recordAuditEvent, getAuditRecords } from "./audit";
import { askLocalAI } from './ollamaProvider';
const app = express();
const PORT = Number(process.env.PORT) || 3001;

// Allow the API to receive JSON request bodies.
app.use(express.json({ limit: "1mb" }));

// Health-check endpoint.
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "ClearGate API",
    providerMode: process.env.AI_PROVIDER_MODE || "mock",
    timestamp: new Date().toISOString(),
  });
});

// Scan and redact sensitive information.
app.post("/api/scan", (req, res) => {
  const body: unknown = req.body;

  if (!body || typeof body !== "object") {
    return res.status(400).json({
      error: "Request body must be a JSON object.",
    });
  }

  const input = body as {
    text?: unknown;
    customTerms?: unknown;
  };

  if (typeof input.text !== "string" || !input.text.trim()) {
    return res.status(400).json({
      error: "text must be a non-empty string.",
    });
  }

  if (
    input.customTerms !== undefined &&
    (!Array.isArray(input.customTerms) ||
      !input.customTerms.every(
        (term: unknown) => typeof term === "string",
      ))
  ) {
    return res.status(400).json({
      error: "customTerms must be an array of strings.",
    });
  }

  try {
    const result = scanDocument(
      input.text,
      (input.customTerms ?? []) as string[],
    );

    const validation = validatePrivacy(result);

    const detections = [
      { type: "EMAIL", count: result.counts.emails },
      { type: "PHONE", count: result.counts.phones },
      {
        type: "STRUCTURED_FIELD",
        count: result.counts.structuredFields,
      },
      {
        type: "CUSTOM_PHRASE",
        count: result.counts.customPhrases,
      },
    ].filter((detection) => detection.count > 0);

    const totalDetections = Object.values(result.counts).reduce(
      (total, count) => total + count,
      0,
    );

    return res.json({
      sanitizedText: result.sanitizedText,
      detections,
      totalDetections,
      policy: {
        allowed: validation.valid,
        status: validation.valid ? "PASS" : "BLOCKED",
        reason: validation.reason ?? null,
      },
    });
  } catch {
    return res.status(400).json({
      error: "Unable to scan the supplied text.",
    });
  }
});


type SecureProcessBody = {
  document?: unknown;
  question?: unknown;
  customTerms?: unknown;
};

app.post("/api/secure-process", async (req, res) => {
  const body: unknown = req.body;

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return res.status(400).json({
      status: "BLOCKED",
      reasons: ["Request body must be a JSON object."],
    });
  }

  const input = body as SecureProcessBody;

  if (
    typeof input.document !== "string" ||
    !input.document.trim() ||
    typeof input.question !== "string" ||
    !input.question.trim()
  ) {
    return res.status(400).json({
      status: "BLOCKED",
      reasons: ["document and question must be non-empty strings."],
    });
  }

  if (
    input.customTerms !== undefined &&
    (!Array.isArray(input.customTerms) ||
      !input.customTerms.every(
        (term: unknown) => typeof term === "string",
      ))
  ) {
    return res.status(400).json({
      status: "BLOCKED",
      reasons: ["customTerms must be an array of strings."],
    });
  }

  try {
    const customTerms = (input.customTerms ?? []) as string[];

    // Scan the document and question independently.
    const documentResult = scanDocument(input.document, customTerms);
    const questionResult = scanDocument(input.question, customTerms);

    // Validate both sanitized inputs before any provider can be called.
    const documentValidation = validatePrivacy(documentResult);
    const questionValidation = validatePrivacy(questionResult);

    const reasons: string[] = [];

    if (!documentValidation.valid) {
      reasons.push("Document privacy validation failed.");
    }

    if (!questionValidation.valid) {
      reasons.push("Question privacy validation failed.");
    }

    
if (reasons.length > 0) {
  const audit = recordAuditEvent({
    status: "BLOCKED",
    providerMode: process.env.AI_PROVIDER_MODE || "mock",
    detectionCounts: {
      emails: documentResult.counts.emails + questionResult.counts.emails,
      phones: documentResult.counts.phones + questionResult.counts.phones,
      structuredFields:
        documentResult.counts.structuredFields +
        questionResult.counts.structuredFields,
      customPhrases:
        documentResult.counts.customPhrases +
        questionResult.counts.customPhrases,
    },
    reasonCodes: [
      ...(!documentValidation.valid
        ? ["DOCUMENT_PRIVACY_VALIDATION_FAILED"]
        : []),
      ...(!questionValidation.valid
        ? ["QUESTION_PRIVACY_VALIDATION_FAILED"]
        : []),
    ],
  });

  return res.status(422).json({
    status: "BLOCKED",
    auditId: audit.auditId,
    sanitizedDocument: documentResult.sanitizedText,
    sanitizedQuestion: questionResult.sanitizedText,
    reasons,
    providerMode: process.env.AI_PROVIDER_MODE || "mock",
  });
}

 const providerMode = process.env.AI_PROVIDER_MODE || "mock";

const audit = recordAuditEvent({
  status: "ALLOWED",
  providerMode,
  detectionCounts: {
    emails: documentResult.counts.emails + questionResult.counts.emails,
    phones: documentResult.counts.phones + questionResult.counts.phones,
    structuredFields:
      documentResult.counts.structuredFields +
      questionResult.counts.structuredFields,
    customPhrases:
      documentResult.counts.customPhrases +
      questionResult.counts.customPhrases,
  },
  reasonCodes: [],
});


let answer: string

if (providerMode === 'mock') {
  answer = 'Mock mode: privacy validation passed. No AI provider was called.'
} else if (providerMode === 'ollama') {
  answer = await askLocalAI(
    documentResult.sanitizedText,
    questionResult.sanitizedText
  )
} else {
  throw new Error('Unsupported AI provider mode.')
}
    return res.json({
      status: "ALLOWED",
      sanitizedDocument: documentResult.sanitizedText,
      sanitizedQuestion: questionResult.sanitizedText,
      answer,
      providerMode: process.env.AI_PROVIDER_MODE || "mock",
      reasons: [],
    });
  } catch {
    return res.status(400).json({
      status: "BLOCKED",
      reasons: ["Unable to securely process the supplied inputs."],
    });
  }
});

// Return audit metadata only.
app.get("/api/audit", (_req, res) => {
  const records = getAuditRecords();

  res.json({
    count: records.length,
    records,
  });
});


// Start the backend server.
app.listen(PORT, () => {
  console.log(`ClearGate API running at http://localhost:${PORT}`);
});
