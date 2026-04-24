"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AI_PROVIDER_TOKEN = exports.IssueSeverity = exports.IssueType = void 0;
var IssueType;
(function (IssueType) {
    IssueType["COMPLIANCE"] = "compliance";
    IssueType["COMPLETENESS"] = "completeness";
    IssueType["TECHNICAL"] = "technical";
    IssueType["SAFETY"] = "safety";
    IssueType["ENVIRONMENTAL"] = "environmental";
})(IssueType || (exports.IssueType = IssueType = {}));
var IssueSeverity;
(function (IssueSeverity) {
    IssueSeverity["CRITICAL"] = "critical";
    IssueSeverity["HIGH"] = "high";
    IssueSeverity["MEDIUM"] = "medium";
    IssueSeverity["LOW"] = "low";
    IssueSeverity["INFO"] = "info";
})(IssueSeverity || (exports.IssueSeverity = IssueSeverity = {}));
exports.AI_PROVIDER_TOKEN = 'AI_PROVIDER';
//# sourceMappingURL=ai-provider.interface.js.map