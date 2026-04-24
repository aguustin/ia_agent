"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildStorageKey = buildStorageKey;
function buildStorageKey(params) {
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
//# sourceMappingURL=storage.utils.js.map