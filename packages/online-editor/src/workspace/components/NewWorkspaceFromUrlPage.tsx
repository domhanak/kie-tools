/*
 * Copyright 2021 Red Hat, Inc. and/or its affiliates.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { encoder, LocalFile, useWorkspaces } from "../WorkspacesContext";
import { useRoutes } from "../../navigation/Hooks";
import { useHistory } from "react-router";
import * as React from "react";
import { useCallback, useEffect, useState } from "react";
import { Bullseye } from "@patternfly/react-core/dist/js/layouts/Bullseye";
import { Spinner } from "@patternfly/react-core/dist/js/components/Spinner";
import { Text, TextContent, TextVariants } from "@patternfly/react-core/dist/js/components/Text";
import { QueryParams } from "../../navigation/Routes";
import { useQueryParam } from "../../queryParams/QueryParamsContext";
import { EditorPageErrorPage } from "../../editor/EditorPageErrorPage";
import { OnlineEditorPage } from "../../pageTemplate/OnlineEditorPage";
import { PageSection } from "@patternfly/react-core/dist/js/components/Page";
import { basename } from "path";
import { WorkspaceKind } from "../model/WorkspaceOrigin";
import { GIST_DEFAULT_BRANCH, GIT_DEFAULT_BRANCH } from "../services/GitService";
import { UrlType, useImportableUrl } from "../hooks/ImportableUrlHooks";
import { useGitHubAuthInfo } from "../../github/Hooks";
import { useSettingsDispatch } from "../../settings/SettingsContext";

export function NewWorkspaceFromUrlPage() {
  const workspaces = useWorkspaces();
  const routes = useRoutes();
  const history = useHistory();
  const githubAuthInfo = useGitHubAuthInfo();
  const settingsDispatch = useSettingsDispatch();
  const [importingError, setImportingError] = useState("");

  const queryParamUrl = useQueryParam(QueryParams.URL);
  const queryParamBranch = useQueryParam(QueryParams.BRANCH);

  const importGitWorkspace: typeof workspaces.createWorkspaceFromGitRepository = useCallback(
    async (args) => {
      let res;
      try {
        res = await workspaces.createWorkspaceFromGitRepository(args);
      } catch (e) {
        if (queryParamBranch) {
          // If a branch is specified, we don't want to attempt `master`.
          throw e;
        }

        try {
          res = await workspaces.createWorkspaceFromGitRepository({
            ...args,
            origin: { ...args.origin, branch: "master" },
          });
        } catch (ee) {
          throw new Error(ee);
        }
      }

      const { workspace, suggestedFirstFile } = res;

      if (!suggestedFirstFile) {
        history.replace({ pathname: routes.home.path({}) });
        return res;
      }

      history.replace({
        pathname: routes.workspaceWithFilePath.path({
          workspaceId: workspace.workspaceId,
          fileRelativePath: suggestedFirstFile.relativePathWithoutExtension,
          extension: suggestedFirstFile.extension,
        }),
      });
      return res;
    },
    [routes, history, workspaces, queryParamBranch]
  );

  const createWorkspaceForFile = useCallback(
    async (file: LocalFile) => {
      workspaces
        .createWorkspaceFromLocal({ useInMemoryFs: false, localFiles: [file] })
        .then(({ workspace, suggestedFirstFile }) => {
          if (!suggestedFirstFile) {
            return;
          }
          history.replace({
            pathname: routes.workspaceWithFilePath.path({
              workspaceId: workspace.workspaceId,
              fileRelativePath: suggestedFirstFile.relativePathWithoutExtension,
              extension: suggestedFirstFile.extension,
            }),
          });
        });
    },
    [routes, history, workspaces]
  );

  const importableUrl = useImportableUrl(queryParamUrl);

  useEffect(() => {
    async function run() {
      const singleFile = [UrlType.FILE, UrlType.GIST_FILE, UrlType.GITHUB_FILE].includes(importableUrl.type);
      const shouldAttemptImportingAsGitRepository = !singleFile && importableUrl.type !== UrlType.GIST;

      if (shouldAttemptImportingAsGitRepository) {
        // try to import the URL as a git repository first
        try {
          const url = new URL(queryParamUrl!);
          if (url.host !== window.location.host) {
            await importGitWorkspace({
              origin: {
                kind: WorkspaceKind.GIT,
                url,
                branch: queryParamBranch ?? GIT_DEFAULT_BRANCH,
              },
              gitConfig: githubAuthInfo,
            });

            return;
          } else {
            // ignore and continue
          }
        } catch (e) {
          console.error(e);
          // ignore error and continue
        }
      }

      // proceed normally
      try {
        if (importableUrl.error) {
          setImportingError(importableUrl.error);
          return;
        }

        // github
        if (importableUrl.type === UrlType.GITHUB) {
          await importGitWorkspace({
            origin: {
              kind: WorkspaceKind.GIT,
              url: importableUrl.url,
              branch: queryParamBranch ?? importableUrl.branch ?? GIT_DEFAULT_BRANCH,
            },
            gitConfig: githubAuthInfo,
            authInfo: githubAuthInfo,
          });
        } else if (importableUrl.type === UrlType.GIT) {
          await importGitWorkspace({
            origin: {
              kind: WorkspaceKind.GIT,
              url: importableUrl.url,
              branch: GIT_DEFAULT_BRANCH,
            },
            gitConfig: githubAuthInfo,
          });
        }

        // gist
        else if (importableUrl.type === UrlType.GIST) {
          importableUrl.url.hash = "";

          const { workspace, suggestedFirstFile } = await workspaces.createWorkspaceFromGitRepository({
            origin: { kind: WorkspaceKind.GITHUB_GIST, url: importableUrl.url, branch: GIST_DEFAULT_BRANCH },
          });

          if (!suggestedFirstFile) {
            history.replace({ pathname: routes.home.path({}) });
            return;
          }

          history.replace({
            pathname: routes.workspaceWithFilePath.path({
              workspaceId: workspace.workspaceId,
              fileRelativePath: suggestedFirstFile.relativePathWithoutExtension,
              extension: suggestedFirstFile.extension,
            }),
          });
        }

        // any
        else if (singleFile) {
          let rawUrl = importableUrl.url as URL;

          if (importableUrl.type === UrlType.GITHUB_FILE) {
            const res = await settingsDispatch.github.octokit.repos.getContent({
              repo: importableUrl.repo,
              owner: importableUrl.org,
              ref: importableUrl.branch,
              path: decodeURIComponent(importableUrl.filePath),
              headers: {
                "If-None-Match": "",
              },
            });
            rawUrl = new URL((res.data as any).download_url);
          }

          if (importableUrl.type === UrlType.GIST_FILE) {
            const { data } = await settingsDispatch.github.octokit.gists.get({ gist_id: importableUrl.gistId });
            const fileName =
              Object.keys(data.files!).find((k) => k.toLowerCase() === importableUrl.fileName.toLowerCase()) ??
              Object.keys(data.files!)[0];
            rawUrl = new URL((data as any).files[fileName].raw_url);
          }

          const response = await fetch(rawUrl.toString());
          if (!response.ok) {
            setImportingError(`${response.status}${response.statusText ? `- ${response.statusText}` : ""}`);
            return;
          }

          const content = await response.text();

          await createWorkspaceForFile({
            path: basename(decodeURIComponent(rawUrl.pathname)),
            getFileContents: () => Promise.resolve(encoder.encode(content)),
          });
        }

        // zip
        else if (importableUrl.type === UrlType.ZIP) {
          throw new Error("Importing ZIPs is not supported yet.");
        }

        // invalid
        else {
          throw new Error("Invalid UrlType " + importableUrl.type);
        }
      } catch (e) {
        setImportingError(e.toString());
        return;
      }
    }

    run();
  }, [
    createWorkspaceForFile,
    routes,
    history,
    importGitWorkspace,
    importableUrl,
    queryParamBranch,
    queryParamUrl,
    githubAuthInfo,
    workspaces,
    settingsDispatch,
  ]);

  return (
    <>
      <OnlineEditorPage>
        {importingError && <EditorPageErrorPage path={importableUrl.url.toString()} errors={[importingError]} />}
        {!importingError && (
          <PageSection variant={"light"} isFilled={true} padding={{ default: "noPadding" }}>
            <Bullseye>
              <TextContent>
                <Bullseye>
                  <Spinner />
                </Bullseye>
                <br />
                <Text component={TextVariants.p}>{`Importing from '${queryParamUrl}'`}</Text>
              </TextContent>
            </Bullseye>
          </PageSection>
        )}
      </OnlineEditorPage>
    </>
  );
}
