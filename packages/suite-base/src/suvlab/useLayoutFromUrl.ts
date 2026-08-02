// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { useSnackbar } from "notistack";
import { useCallback } from "react";

import Logger from "@lichtblick/log";
import { useLayoutManager } from "@lichtblick/suite-base/context/LayoutManagerContext";
import { useLayoutTransfer } from "@lichtblick/suite-base/hooks/useLayoutTransfer";

const log = Logger.getLogger(__filename);

/** Fetch a layout preset and switch to it.
 *
 *  Lifted out of Workspace, which did this once at startup for the layoutUrl
 *  parameter. The app bar's layout picker does the same thing on every change,
 *  and installing a second copy each time — parseAndInstallLayout always saves
 *  a new one — would fill the layout list with duplicates.
 */
export function useLayoutFromUrl(): (layoutUrl: string) => Promise<void> {
  const layoutManager = useLayoutManager();
  const { parseAndInstallLayout } = useLayoutTransfer();
  const { enqueueSnackbar } = useSnackbar();

  return useCallback(
    async (layoutUrl: string) => {
      if (layoutUrl === "") {
        return;
      }

      // Validate URL protocol - only http/https are allowed for security
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(layoutUrl);
      } catch {
        enqueueSnackbar("Invalid layout URL", { variant: "error" });
        return;
      }

      if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        enqueueSnackbar("Layout URL must use http or https protocol", { variant: "error" });
        return;
      }

      // Use origin+pathname for logging/naming to avoid leaking credentials from query params
      const safeUrlLabel = `${parsedUrl.origin}${parsedUrl.pathname}`;

      try {
        const response = await fetch(layoutUrl);
        if (!response.ok) {
          log.error(`Failed to fetch layout: ${safeUrlLabel} (status ${response.status})`);
          enqueueSnackbar(`Failed to load layout (HTTP ${response.status})`, { variant: "error" });
          return;
        }

        // Derive filename from sanitized pathname (no credentials in name)
        const rawFilename = parsedUrl.pathname.split("/").pop();
        const filename =
          rawFilename != undefined && rawFilename !== "" ? rawFilename : "layout.json";
        const dotIndex = filename.lastIndexOf(".");
        const layoutName = dotIndex > 0 ? filename.slice(0, dotIndex) : filename;

        // Find existing layouts with the same name before saving (safe deduplication)
        const existingLayouts = await layoutManager.getLayouts();
        const matchingLayouts = existingLayouts.filter((layout) => layout.name === layoutName);

        // Delegate JSON parsing, saving, and selection to parseAndInstallLayout
        const text = await response.text();
        const file = new File([text], filename, { type: "application/json" });
        const newLayout = await parseAndInstallLayout(file, "local");

        // Only delete old layouts after successful save to avoid data loss
        if (newLayout) {
          for (const layout of matchingLayouts) {
            await layoutManager.deleteLayout({ id: layout.id });
          }
        }
      } catch (error) {
        log.error(`Could not load layout from ${safeUrlLabel}`, error);
        enqueueSnackbar("Failed to load layout from URL", { variant: "error" });
      }
    },
    [layoutManager, parseAndInstallLayout, enqueueSnackbar],
  );
}
