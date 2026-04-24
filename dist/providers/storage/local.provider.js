"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var LocalStorageService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalStorageService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const fs = require("fs/promises");
const path = require("path");
const storage_errors_1 = require("./storage.errors");
const storage_utils_1 = require("./storage.utils");
let LocalStorageService = LocalStorageService_1 = class LocalStorageService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(LocalStorageService_1.name);
        this.storagePath = path.resolve(this.config.get('localStorage.path', './uploads'));
        this.baseUrl = this.config
            .get('localStorage.baseUrl', 'http://localhost:3000')
            .replace(/\/$/, '');
        this.logger.log(`Local storage initialized — path: ${this.storagePath}`);
    }
    async upload(file, key, _options) {
        const filePath = this.resolveKey(key);
        try {
            await fs.mkdir(path.dirname(filePath), { recursive: true });
            await fs.writeFile(filePath, file);
            this.logger.debug(`Stored ${file.length}B → ${filePath}`);
            return key;
        }
        catch (error) {
            throw new storage_errors_1.StorageUploadError(key, error);
        }
    }
    async download(key) {
        const filePath = this.resolveKey(key);
        try {
            return await fs.readFile(filePath);
        }
        catch (error) {
            if (error.code === 'ENOENT')
                throw new storage_errors_1.StorageFileNotFoundError(key);
            throw new storage_errors_1.StorageDownloadError(key, error);
        }
    }
    async delete(key) {
        const filePath = this.resolveKey(key);
        try {
            await fs.unlink(filePath);
            this.logger.debug(`Deleted local file: ${filePath}`);
        }
        catch (error) {
            if (error.code === 'ENOENT')
                return;
            throw new storage_errors_1.StorageDeleteError(key, error);
        }
    }
    getUrl(key) {
        return `${this.baseUrl}/storage/files/${key}`;
    }
    async getSignedUrl(key, _options) {
        return this.getUrl(key);
    }
    buildKey(params) {
        return (0, storage_utils_1.buildStorageKey)(params);
    }
    resolveKey(key) {
        const normalized = path.normalize(key.split('/').join(path.sep));
        return path.join(this.storagePath, normalized);
    }
};
exports.LocalStorageService = LocalStorageService;
exports.LocalStorageService = LocalStorageService = LocalStorageService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], LocalStorageService);
//# sourceMappingURL=local.provider.js.map