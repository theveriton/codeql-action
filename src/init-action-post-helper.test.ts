import test from "ava";
import * as sinon from "sinon";

import * as actionsUtil from "./actions-util";
import * as codeql from "./codeql";
import * as configUtils from "./config-utils";
import { Feature } from "./feature-flags";
import * as initActionPostHelper from "./init-action-post-helper";
import { getRunnerLogger } from "./logging";
import { parseRepositoryNwo } from "./repository";
import {
  createFeatures,
  getRecordingLogger,
  setupTests,
} from "./testing-utils";
import * as uploadLib from "./upload-lib";
import * as util from "./util";
import * as workflow from "./workflow";

setupTests(test);

test("post: init action with debug mode off", async (t) => {
  return await util.withTmpDir(async (tmpDir) => {
    process.env["RUNNER_TEMP"] = tmpDir;

    const gitHubVersion: util.GitHubVersion = {
      type: util.GitHubVariant.DOTCOM,
    };
    sinon.stub(configUtils, "getConfig").resolves({
      debugMode: false,
      gitHubVersion,
      languages: [],
      packs: [],
    } as unknown as configUtils.Config);

    const uploadDatabaseBundleSpy = sinon.spy();
    const uploadLogsSpy = sinon.spy();
    const printDebugLogsSpy = sinon.spy();

    await initActionPostHelper.run(
      uploadDatabaseBundleSpy,
      uploadLogsSpy,
      printDebugLogsSpy,
      parseRepositoryNwo("github/codeql-action"),
      createFeatures([]),
      getRunnerLogger(true)
    );

    t.assert(uploadDatabaseBundleSpy.notCalled);
    t.assert(uploadLogsSpy.notCalled);
    t.assert(printDebugLogsSpy.notCalled);
  });
});

test("post: init action with debug mode on", async (t) => {
  return await util.withTmpDir(async (tmpDir) => {
    process.env["RUNNER_TEMP"] = tmpDir;

    const gitHubVersion: util.GitHubVersion = {
      type: util.GitHubVariant.DOTCOM,
    };
    sinon.stub(configUtils, "getConfig").resolves({
      debugMode: true,
      gitHubVersion,
      languages: [],
      packs: [],
    } as unknown as configUtils.Config);

    const uploadDatabaseBundleSpy = sinon.spy();
    const uploadLogsSpy = sinon.spy();
    const printDebugLogsSpy = sinon.spy();

    await initActionPostHelper.run(
      uploadDatabaseBundleSpy,
      uploadLogsSpy,
      printDebugLogsSpy,
      parseRepositoryNwo("github/codeql-action"),
      createFeatures([]),
      getRunnerLogger(true)
    );

    t.assert(uploadDatabaseBundleSpy.called);
    t.assert(uploadLogsSpy.called);
    t.assert(printDebugLogsSpy.called);
  });
});

test("uploads failed SARIF run for typical workflow", async (t) => {
  const config = {
    codeQLCmd: "codeql",
    debugMode: true,
    languages: [],
    packs: [],
  } as unknown as configUtils.Config;
  const messages = [];
  process.env["GITHUB_JOB"] = "analyze";
  process.env["GITHUB_WORKSPACE"] =
    "/home/runner/work/codeql-action/codeql-action";
  sinon.stub(actionsUtil, "getRequiredInput").withArgs("matrix").returns("{}");

  const codeqlObject = await codeql.getCodeQLForTesting();
  sinon.stub(codeql, "getCodeQL").resolves(codeqlObject);
  const diagnosticsExportStub = sinon.stub(codeqlObject, "diagnosticsExport");

  sinon.stub(workflow, "getWorkflow").resolves({
    name: "CodeQL",
    on: {
      push: {
        branches: ["main"],
      },
      pull_request: {
        branches: ["main"],
      },
    },
    jobs: {
      analyze: {
        name: "CodeQL Analysis",
        "runs-on": "ubuntu-latest",
        steps: [
          {
            name: "Checkout repository",
            uses: "actions/checkout@v3",
          },
          {
            name: "Initialize CodeQL",
            uses: "github/codeql-action/init@v2",
            with: {
              languages: "javascript",
            },
          },
          {
            name: "Perform CodeQL Analysis",
            uses: "github/codeql-action/analyze@v2",
            with: {
              category: "my-category",
            },
          },
        ],
      },
    },
  });

  const uploadFromActions = sinon.stub(uploadLib, "uploadFromActions");
  uploadFromActions.resolves({ sarifID: "42" } as uploadLib.UploadResult);
  const waitForProcessing = sinon.stub(uploadLib, "waitForProcessing");

  await initActionPostHelper.uploadFailedSarif(
    config,
    parseRepositoryNwo("github/codeql-action"),
    createFeatures([Feature.UploadFailedSarifEnabled]),
    getRecordingLogger(messages)
  );
  t.deepEqual(messages, []);
  t.true(
    diagnosticsExportStub.calledOnceWith(sinon.match.string, "my-category")
  );
  t.true(
    uploadFromActions.calledOnceWith(
      sinon.match.string,
      sinon.match.string,
      "my-category",
      sinon.match.any
    )
  );
  t.true(
    waitForProcessing.calledOnceWith(sinon.match.any, "42", sinon.match.any, {
      isUnsuccessfulExecution: true,
    })
  );
});
