"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CONFIG = exports.NAMING_STYLES = exports.CONFIG_FILE_NAME = void 0;
exports.loadConfig = loadConfig;
const fs = __importStar(require("node:fs/promises"));
const path = __importStar(require("node:path"));
exports.CONFIG_FILE_NAME = 'lazy-naming.json';
exports.NAMING_STYLES = ['camelCase', 'snake_case', 'PascalCase'];
exports.DEFAULT_CONFIG = {
    namingStyle: 'camelCase',
    commentLanguage: 'en',
    prefixRules: {},
    customRules: '',
};
function cloneDefault() {
    return {
        ...exports.DEFAULT_CONFIG,
        prefixRules: { ...exports.DEFAULT_CONFIG.prefixRules },
    };
}
function isNamingStyle(value) {
    return (typeof value === 'string' && exports.NAMING_STYLES.includes(value));
}
function sanitizePrefixRules(value) {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        return null;
    }
    const result = {};
    for (const [key, entry] of Object.entries(value)) {
        if (Array.isArray(entry) && entry.every((item) => typeof item === 'string')) {
            result[key] = entry;
        }
    }
    return result;
}
async function loadConfig(workspaceRoot) {
    const configPath = path.join(workspaceRoot, '.vscode', exports.CONFIG_FILE_NAME);
    let raw;
    try {
        raw = await fs.readFile(configPath, 'utf8');
    }
    catch (error) {
        const code = error.code;
        if (code === 'ENOENT') {
            return cloneDefault();
        }
        throw error;
    }
    let parsed;
    try {
        parsed = JSON.parse(raw);
    }
    catch {
        console.warn(`[lazy-naming] Ignoring malformed config at ${configPath}: falling back to defaults.`);
        return cloneDefault();
    }
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        console.warn(`[lazy-naming] Config at ${configPath} is not an object: falling back to defaults.`);
        return cloneDefault();
    }
    const file = parsed;
    const config = cloneDefault();
    if (file.namingStyle !== undefined) {
        if (isNamingStyle(file.namingStyle)) {
            config.namingStyle = file.namingStyle;
        }
        else {
            console.warn(`[lazy-naming] Unknown namingStyle ${JSON.stringify(file.namingStyle)}; using "${config.namingStyle}".`);
        }
    }
    if (file.commentLanguage !== undefined) {
        if (typeof file.commentLanguage === 'string' &&
            file.commentLanguage.trim() !== '') {
            config.commentLanguage = file.commentLanguage.trim();
        }
        else {
            console.warn(`[lazy-naming] Invalid commentLanguage ${JSON.stringify(file.commentLanguage)}; using "${config.commentLanguage}".`);
        }
    }
    if (file.prefixRules !== undefined) {
        const prefixRules = sanitizePrefixRules(file.prefixRules);
        if (prefixRules !== null) {
            config.prefixRules = prefixRules;
        }
        else {
            console.warn('[lazy-naming] Invalid prefixRules; expected an object of string arrays. Ignoring it.');
        }
    }
    if (file.customRules !== undefined) {
        if (typeof file.customRules === 'string') {
            config.customRules = file.customRules;
        }
        else {
            console.warn('[lazy-naming] Invalid customRules; expected a string. Ignoring it.');
        }
    }
    return config;
}
