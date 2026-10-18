import test from "node:test";
import assert from "node:assert/strict";
import {
  scanDocument,
  validatePrivacy,
  processForAI,
} from "./privacy";

// Test 1: Email addresses are redacted.
test("redacts email addresses", () => {
  const result = scanDocument(
    "Contact demo@example.com for support.",
  );

  assert.equal(result.counts.emails, 1);
  assert.ok(!result.sanitizedText.includes("demo@example.com"));
  assert.ok(result.sanitizedText.includes("[REDACTED]"));
});

// Test 2: Indian mobile numbers are redacted.
test("redacts Indian mobile numbers", () => {
  const result = scanDocument(
    "Call 9876543210 for the test.",
  );

  assert.equal(result.counts.phones, 1);
  assert.ok(!result.sanitizedText.includes("9876543210"));
});

// Test 3: Structured fields are redacted.
test("redacts structured fields", () => {
  const result = scanDocument(
    "Name: Sample User\nAccount Number: TEST-123",
  );

  assert.equal(result.counts.structuredFields, 2);
  assert.ok(result.sanitizedText.includes("Name: [REDACTED]"));
  assert.ok(result.sanitizedText.includes("Account Number: [REDACTED]"));
});

// Test 4: Custom confidential phrases are redacted.
test("redacts custom confidential phrases", () => {
  const result = scanDocument(
    "The project is called PROJECT ORION.",
    ["PROJECT ORION"],
  );

  assert.equal(result.counts.customPhrases, 1);
  assert.ok(!result.sanitizedText.includes("PROJECT ORION"));
});

// Test 5: Sanitized email content passes validation.
test("validates sanitized text", () => {
  const result = scanDocument(
    "Contact demo@example.com.",
  );

  assert.equal(validatePrivacy(result).valid, true);
});

// Test 6: Invalid input is rejected.
test("rejects empty input", () => {
  assert.throws(() => scanDocument(""), /Invalid input/);
});

// Test 7: Invalid privacy validation blocks processing.
// Test 7: Reject text when an email remains.
test("rejects text when an email remains", () => {
  const result = {
    sanitizedText: "Contact demo@example.com.",
    categories: [],
    counts: {
      emails: 0,
      phones: 0,
      structuredFields: 0,
      customPhrases: 0,
    },
  };

  assert.equal(validatePrivacy(result).valid, false);
});

// Test 8: Process text only after redaction.
test("rejects text when an email remains", () => {
  const result = {
    sanitizedText: "Contact demo@example.com.",
    categories: [],
    counts: {
      emails: 0,
      phones: 0,
      structuredFields: 0,
      customPhrases: 0,
    },
  };

  assert.equal(validatePrivacy(result).valid, false);
});