// Deterministic record deduplication. Names alone never establish identity.
export function canonicalId(record) {
  if (record.lei) return "lei:" + String(record.lei).toUpperCase();
  if (record.domain) return "domain:" + String(record.domain).toLowerCase();
  return record.id || null;
}
export function deduplicate(records) {
  const seen = new Map();
  for (const record of records || []) {
    const id = canonicalId(record);
    if (id && !seen.has(id)) seen.set(id, record);
  }
  return [...seen.values()];
}
export function evidenceStatus(record) {
  return record?.source?.url ? "source-linked" : "unverified";
}
