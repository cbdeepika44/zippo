
import { randomUUID } from "node:crypto";

export type AuditStatus = "ALLOWED" | "BLOCKED";

export interface DetectionCounts {
  emails: number;
  phones: number;
  structuredFields: number;
  customPhrases: number;
}

export interface NewAuditRecord {
  status: AuditStatus;
  providerMode: string;
  detectionCounts: DetectionCounts;
  reasonCodes?: string[];
}

export interface AuditRecord {
  auditId: string;
  timestamp: string;
  status: AuditStatus;
  providerMode: string;
  detectionCounts: DetectionCounts;
  totalDetections: number;
  reasonCodes: string[];
}

// In-memory storage: records disappear when the server restarts.
const auditRecords: AuditRecord[] = [];
const MAX_AUDIT_RECORDS = 500;

/**
 * Store audit metadata only.
 * Never pass documents, questions, or raw sensitive values here.
 */
export function recordAuditEvent(
  input: NewAuditRecord,
): AuditRecord {
  const counts: DetectionCounts = {
    emails: input.detectionCounts.emails,
    phones: input.detectionCounts.phones,
    structuredFields: input.detectionCounts.structuredFields,
    customPhrases: input.detectionCounts.customPhrases,
  };

  const totalDetections = Object.values(counts).reduce(
    (total, count) => total + count,
    0,
  );

  const record: AuditRecord = {
    auditId: randomUUID(),
    timestamp: new Date().toISOString(),
    status: input.status,
    providerMode: input.providerMode,
    detectionCounts: counts,
    totalDetections,
    // Callers should supply fixed reason codes, never user-provided text.
    reasonCodes: [...(input.reasonCodes ?? [])],
  };

  auditRecords.unshift(record);

  if (auditRecords.length > MAX_AUDIT_RECORDS) {
    auditRecords.length = MAX_AUDIT_RECORDS;
  }

  // Return a copy so callers cannot mutate the stored record.
  return {
    ...record,
    detectionCounts: { ...record.detectionCounts },
    reasonCodes: [...record.reasonCodes],
  };
}

/**
 * Return audit metadata newest-first.
 */
export function getAuditRecords(): AuditRecord[] {
  return auditRecords.map((record) => ({
    ...record,
    detectionCounts: { ...record.detectionCounts },
    reasonCodes: [...record.reasonCodes],
  }));
}
