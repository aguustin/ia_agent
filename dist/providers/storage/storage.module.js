"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const file_storage_interface_1 = require("./file-storage.interface");
const local_files_controller_1 = require("./local-files.controller");
const local_provider_1 = require("./local.provider");
const r2_provider_1 = require("./r2.provider");
let StorageModule = class StorageModule {
};
exports.StorageModule = StorageModule;
exports.StorageModule = StorageModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        controllers: [local_files_controller_1.LocalFilesController],
        providers: [
            r2_provider_1.R2StorageService,
            local_provider_1.LocalStorageService,
            {
                provide: file_storage_interface_1.FILE_STORAGE_SERVICE,
                inject: [config_1.ConfigService, r2_provider_1.R2StorageService, local_provider_1.LocalStorageService],
                useFactory: (config, r2, local) => {
                    const provider = config.get('STORAGE_PROVIDER', 'local');
                    return provider === 'r2' ? r2 : local;
                },
            },
        ],
        exports: [file_storage_interface_1.FILE_STORAGE_SERVICE],
    })
], StorageModule);
//# sourceMappingURL=storage.module.js.map