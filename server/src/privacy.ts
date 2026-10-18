const REDACTED = "[REDACTED]";

export interface ScanResult {
  sanitizedText: string;
  categories: string[];
  counts: {
    emails: number;
    phones: number;
    structuredFields: number;
    customPhrases: number;
  };
}

export interface PrivacyValidation {
  valid: boolean;
  reason?: string;
}

// Escape special characters in custom phrases.
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Detect and redact sensitive information.
 */
export function scanDocument(
  text: string,
  customPhrases: string[] = [],
): ScanResult {
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Invalid input: text must be a non-empty string.");
  }

  let sanitizedText = text;
  const categories: string[] = [];

  const counts = {
    emails: 0,
    phones: 0,
    structuredFields: 0,
    customPhrases: 0,
  };

  // Detect and redact email addresses.
  const emailRegex =
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

  const emailMatches = sanitizedText.match(emailRegex) ?? [];
  counts.emails = emailMatches.length;

  if (counts.emails > 0) {
    categories.push("EMAIL");
    sanitizedText = sanitizedText.replace(emailRegex, REDACTED);
  }

  // Detect common Indian mobile and 10-digit phone formats.
  const phoneRegex =
    /(?:\+91[\s-]?)?[6-9]\d{9}|\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;

  const phoneMatches = sanitizedText.match(phoneRegex) ?? [];
  counts.phones = phoneMatches.length;

  if (counts.phones > 0) {
    categories.push("PHONE");
    sanitizedText = sanitizedText.replace(phoneRegex, REDACTED);
  }

  // Detect structured fields on separate lines.
  const fieldPatterns = [
    /(^|\n)(\s*Name\s*:\s*)([^\r\n]+)/gi,
    /(^|\n)(\s*Address\s*:\s*)([^\r\n]+)/gi,
    /(^|\n)(\s*Email\s*:\s*)([^\r\n]+)/gi,
    /(^|\n)(\s*Account Number\s*:\s*)([^\r\n]+)/gi,
  ];

  for (const pattern of fieldPatterns) {
    sanitizedText = sanitizedText.replace(
      pattern,
      (
        _match: string,
        prefix: string,
        label: string,
        value: string,
      ) => {
        if (value.trim()) {
          counts.structuredFields++;
          return `${prefix}${label}${REDACTED}`;
        }

        return `${prefix}${label}${value}`;
      },
    );
  }

  if (counts.structuredFields > 0) {
    categories.push("STRUCTURED_FIELD");
  }

  // Detect user-provided confidential phrases.
  for (const phrase of customPhrases) {
    if (typeof phrase !== "string" || !phrase.trim()) {
      continue;
    }

    const phraseRegex = new RegExp(escapeRegex(phrase), "gi");
    const matches = sanitizedText.match(phraseRegex) ?? [];

    if (matches.length > 0) {
      counts.customPhrases += matches.length;
      sanitizedText = sanitizedText.replace(phraseRegex, REDACTED);

      if (!categories.includes("CUSTOM_PHRASE")) {
        categories.push("CUSTOM_PHRASE");
      }
    }
  }

  return {
    sanitizedText,
    categories,
    counts,
  };
}

/**
 * Validate sanitized text before AI processing.
 */
export function validatePrivacy(
  result: ScanResult,
): PrivacyValidation {
  const emailRegex =
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;

  const phoneRegex =
    /(?:\+91[\s-]?)?[6-9]\d{9}|\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;

  if (emailRegex.test(result.sanitizedText)) {
    return {
      valid: false,
      reason: "Email still found",
    };
  }

  if (phoneRegex.test(result.sanitizedText)) {
    return {
      valid: false,
      reason: "Phone number still found",
    };
  }

  return { valid: true };
}

/**
 * Scan and validate before further processing.
 */
export function processForAI(
  text: string,
  phrases: string[] = [],
): ScanResult {
  const result = scanDocument(text, phrases);
  const validation = validatePrivacy(result);

  if (!validation.valid) {
    throw new Error(
      "Privacy validation failed. AI processing blocked.",
    );
  }

  return result;
}