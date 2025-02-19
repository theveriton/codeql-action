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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path_1 = __importDefault(require("path"));
const ava_1 = __importDefault(require("ava"));
const logging_1 = require("./logging");
const testing_utils_1 = require("./testing-utils");
const util = __importStar(require("./util"));
(0, testing_utils_1.setupTests)(ava_1.default);
(0, ava_1.default)("getToolNames", (t) => {
    const input = fs.readFileSync(`${__dirname}/../src/testdata/tool-names.sarif`, "utf8");
    const toolNames = util.getToolNames(JSON.parse(input));
    t.deepEqual(toolNames, ["CodeQL command-line toolchain", "ESLint"]);
});
(0, ava_1.default)("getMemoryFlag() should return the correct --ram flag", async (t) => {
    const totalMem = os.totalmem() / (1024 * 1024);
    const fixedAmount = process.platform === "win32" ? 1536 : 1024;
    const scaledAmount = 0.02 * totalMem;
    const expectedMemoryValue = Math.floor(totalMem - fixedAmount);
    const expectedMemoryValueWithScaling = Math.floor(totalMem - fixedAmount - scaledAmount);
    const tests = [
        [undefined, false, `--ram=${expectedMemoryValue}`],
        ["", false, `--ram=${expectedMemoryValue}`],
        ["512", false, "--ram=512"],
        [undefined, true, `--ram=${expectedMemoryValueWithScaling}`],
        ["", true, `--ram=${expectedMemoryValueWithScaling}`],
    ];
    for (const [input, withScaling, expectedFlag] of tests) {
        const flag = util.getMemoryFlag(input, withScaling);
        t.deepEqual(flag, expectedFlag);
    }
});
(0, ava_1.default)("getMemoryFlag() throws if the ram input is < 0 or NaN", async (t) => {
    for (const input of ["-1", "hello!"]) {
        t.throws(() => util.getMemoryFlag(input, false));
    }
});
(0, ava_1.default)("getAddSnippetsFlag() should return the correct flag", (t) => {
    t.deepEqual(util.getAddSnippetsFlag(true), "--sarif-add-snippets");
    t.deepEqual(util.getAddSnippetsFlag("true"), "--sarif-add-snippets");
    t.deepEqual(util.getAddSnippetsFlag(false), "--no-sarif-add-snippets");
    t.deepEqual(util.getAddSnippetsFlag(undefined), "--no-sarif-add-snippets");
    t.deepEqual(util.getAddSnippetsFlag("false"), "--no-sarif-add-snippets");
    t.deepEqual(util.getAddSnippetsFlag("foo bar"), "--no-sarif-add-snippets");
});
(0, ava_1.default)("getThreadsFlag() should return the correct --threads flag", (t) => {
    const numCpus = os.cpus().length;
    const tests = [
        ["0", "--threads=0"],
        ["1", "--threads=1"],
        [undefined, `--threads=${numCpus}`],
        ["", `--threads=${numCpus}`],
        [`${numCpus + 1}`, `--threads=${numCpus}`],
        [`${-numCpus - 1}`, `--threads=${-numCpus}`],
    ];
    for (const [input, expectedFlag] of tests) {
        const flag = util.getThreadsFlag(input, (0, logging_1.getRunnerLogger)(true));
        t.deepEqual(flag, expectedFlag);
    }
});
(0, ava_1.default)("getThreadsFlag() throws if the threads input is not an integer", (t) => {
    t.throws(() => util.getThreadsFlag("hello!", (0, logging_1.getRunnerLogger)(true)));
});
(0, ava_1.default)("getExtraOptionsEnvParam() succeeds on valid JSON with invalid options (for now)", (t) => {
    const origExtraOptions = process.env.CODEQL_ACTION_EXTRA_OPTIONS;
    const options = { foo: 42 };
    process.env.CODEQL_ACTION_EXTRA_OPTIONS = JSON.stringify(options);
    t.deepEqual(util.getExtraOptionsEnvParam(), options);
    process.env.CODEQL_ACTION_EXTRA_OPTIONS = origExtraOptions;
});
(0, ava_1.default)("getExtraOptionsEnvParam() succeeds on valid options", (t) => {
    const origExtraOptions = process.env.CODEQL_ACTION_EXTRA_OPTIONS;
    const options = { database: { init: ["--debug"] } };
    process.env.CODEQL_ACTION_EXTRA_OPTIONS = JSON.stringify(options);
    t.deepEqual(util.getExtraOptionsEnvParam(), options);
    process.env.CODEQL_ACTION_EXTRA_OPTIONS = origExtraOptions;
});
(0, ava_1.default)("getExtraOptionsEnvParam() fails on invalid JSON", (t) => {
    const origExtraOptions = process.env.CODEQL_ACTION_EXTRA_OPTIONS;
    process.env.CODEQL_ACTION_EXTRA_OPTIONS = "{{invalid-json}}";
    t.throws(util.getExtraOptionsEnvParam);
    process.env.CODEQL_ACTION_EXTRA_OPTIONS = origExtraOptions;
});
(0, ava_1.default)("parseGitHubUrl", (t) => {
    t.deepEqual(util.parseGitHubUrl("github.com"), "https://github.com");
    t.deepEqual(util.parseGitHubUrl("https://github.com"), "https://github.com");
    t.deepEqual(util.parseGitHubUrl("https://api.github.com"), "https://github.com");
    t.deepEqual(util.parseGitHubUrl("https://github.com/foo/bar"), "https://github.com");
    t.deepEqual(util.parseGitHubUrl("github.example.com"), "https://github.example.com/");
    t.deepEqual(util.parseGitHubUrl("https://github.example.com"), "https://github.example.com/");
    t.deepEqual(util.parseGitHubUrl("https://api.github.example.com"), "https://github.example.com/");
    t.deepEqual(util.parseGitHubUrl("https://github.example.com/api/v3"), "https://github.example.com/");
    t.deepEqual(util.parseGitHubUrl("https://github.example.com:1234"), "https://github.example.com:1234/");
    t.deepEqual(util.parseGitHubUrl("https://api.github.example.com:1234"), "https://github.example.com:1234/");
    t.deepEqual(util.parseGitHubUrl("https://github.example.com:1234/api/v3"), "https://github.example.com:1234/");
    t.deepEqual(util.parseGitHubUrl("https://github.example.com/base/path"), "https://github.example.com/base/path/");
    t.deepEqual(util.parseGitHubUrl("https://github.example.com/base/path/api/v3"), "https://github.example.com/base/path/");
    t.throws(() => util.parseGitHubUrl(""), {
        message: '"" is not a valid URL',
    });
    t.throws(() => util.parseGitHubUrl("ssh://github.com"), {
        message: '"ssh://github.com" is not a http or https URL',
    });
    t.throws(() => util.parseGitHubUrl("http:///::::433"), {
        message: '"http:///::::433" is not a valid URL',
    });
});
(0, ava_1.default)("allowed API versions", async (t) => {
    t.is(util.apiVersionInRange("1.33.0", "1.33", "2.0"), undefined);
    t.is(util.apiVersionInRange("1.33.1", "1.33", "2.0"), undefined);
    t.is(util.apiVersionInRange("1.34.0", "1.33", "2.0"), undefined);
    t.is(util.apiVersionInRange("2.0.0", "1.33", "2.0"), undefined);
    t.is(util.apiVersionInRange("2.0.1", "1.33", "2.0"), undefined);
    t.is(util.apiVersionInRange("1.32.0", "1.33", "2.0"), util.DisallowedAPIVersionReason.ACTION_TOO_NEW);
    t.is(util.apiVersionInRange("2.1.0", "1.33", "2.0"), util.DisallowedAPIVersionReason.ACTION_TOO_OLD);
});
(0, ava_1.default)("doesDirectoryExist", async (t) => {
    // Returns false if no file/dir of this name exists
    t.false(util.doesDirectoryExist("non-existent-file.txt"));
    await util.withTmpDir(async (tmpDir) => {
        // Returns false if file
        const testFile = `${tmpDir}/test-file.txt`;
        fs.writeFileSync(testFile, "");
        t.false(util.doesDirectoryExist(testFile));
        // Returns true if directory
        fs.writeFileSync(`${tmpDir}/nested-test-file.txt`, "");
        t.true(util.doesDirectoryExist(tmpDir));
    });
});
(0, ava_1.default)("listFolder", async (t) => {
    // Returns empty if not a directory
    t.deepEqual(util.listFolder("not-a-directory"), []);
    // Returns empty if directory is empty
    await util.withTmpDir(async (emptyTmpDir) => {
        t.deepEqual(util.listFolder(emptyTmpDir), []);
    });
    // Returns all file names in directory
    await util.withTmpDir(async (tmpDir) => {
        const nestedDir = fs.mkdtempSync(path_1.default.join(tmpDir, "nested-"));
        fs.writeFileSync(path_1.default.resolve(nestedDir, "nested-test-file.txt"), "");
        fs.writeFileSync(path_1.default.resolve(tmpDir, "test-file-1.txt"), "");
        fs.writeFileSync(path_1.default.resolve(tmpDir, "test-file-2.txt"), "");
        fs.writeFileSync(path_1.default.resolve(tmpDir, "test-file-3.txt"), "");
        t.deepEqual(util.listFolder(tmpDir), [
            path_1.default.resolve(nestedDir, "nested-test-file.txt"),
            path_1.default.resolve(tmpDir, "test-file-1.txt"),
            path_1.default.resolve(tmpDir, "test-file-2.txt"),
            path_1.default.resolve(tmpDir, "test-file-3.txt"),
        ]);
    });
});
const longTime = 999999;
const shortTime = 10;
(0, ava_1.default)("withTimeout on long task", async (t) => {
    let longTaskTimedOut = false;
    const longTask = new Promise((resolve) => {
        setTimeout(() => {
            resolve(42);
        }, longTime);
    });
    const result = await util.withTimeout(shortTime, longTask, () => {
        longTaskTimedOut = true;
    });
    t.deepEqual(longTaskTimedOut, true);
    t.deepEqual(result, undefined);
});
(0, ava_1.default)("withTimeout on short task", async (t) => {
    let shortTaskTimedOut = false;
    const shortTask = new Promise((resolve) => {
        setTimeout(() => {
            resolve(99);
        }, shortTime);
    });
    const result = await util.withTimeout(longTime, shortTask, () => {
        shortTaskTimedOut = true;
    });
    t.deepEqual(shortTaskTimedOut, false);
    t.deepEqual(result, 99);
});
(0, ava_1.default)("withTimeout doesn't call callback if promise resolves", async (t) => {
    let shortTaskTimedOut = false;
    const shortTask = new Promise((resolve) => {
        setTimeout(() => {
            resolve(99);
        }, shortTime);
    });
    const result = await util.withTimeout(100, shortTask, () => {
        shortTaskTimedOut = true;
    });
    await new Promise((r) => setTimeout(r, 200));
    t.deepEqual(shortTaskTimedOut, false);
    t.deepEqual(result, 99);
});
function createMockSarifWithNotification(locations) {
    return {
        runs: [
            {
                tool: {
                    driver: {
                        name: "CodeQL",
                    },
                },
                invocations: [
                    {
                        toolExecutionNotifications: [
                            {
                                locations,
                            },
                        ],
                    },
                ],
            },
        ],
    };
}
const stubLocation = {
    physicalLocation: {
        artifactLocation: {
            uri: "file1",
        },
    },
};
(0, ava_1.default)("fixInvalidNotifications leaves notifications with unique locations alone", (t) => {
    const messages = [];
    const result = util.fixInvalidNotifications(createMockSarifWithNotification([stubLocation]), (0, testing_utils_1.getRecordingLogger)(messages));
    t.deepEqual(result, createMockSarifWithNotification([stubLocation]));
    t.is(messages.length, 1);
    t.deepEqual(messages[0], {
        type: "debug",
        message: "No duplicate locations found in SARIF notification objects.",
    });
});
(0, ava_1.default)("fixInvalidNotifications removes duplicate locations", (t) => {
    const messages = [];
    const result = util.fixInvalidNotifications(createMockSarifWithNotification([stubLocation, stubLocation]), (0, testing_utils_1.getRecordingLogger)(messages));
    t.deepEqual(result, createMockSarifWithNotification([stubLocation]));
    t.is(messages.length, 1);
    t.deepEqual(messages[0], {
        type: "info",
        message: "Removed 1 duplicate locations from SARIF notification objects.",
    });
});
//# sourceMappingURL=util.test.js.map