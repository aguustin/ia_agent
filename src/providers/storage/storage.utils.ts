/**
 * Canonical storage key builder shared across all storage providers.
 * Limits key to 200 Unicode code points (not UTF-16 units) to stay within
 * object-key length limits across backends.
 */
export function buildStorageKey(params: {
  tenantId: string;
  projectId: string;
  documentId: string;
  fileName: string;
}): string {
  const sanitized = [
    ...params.fileName
      .normalize('NFC')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_{2,}/g, '_'),
  ]
    .slice(0, 200)
    .join('');

  return `tenants/${params.tenantId}/projects/${params.projectId}/documents/${params.documentId}/${sanitized}`;
}
