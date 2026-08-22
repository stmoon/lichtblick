// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { useSnackbar } from "notistack";
import { useCallback } from "react";

import Logger from "@lichtblick/log";
import { useCurrentLayoutActions } from "@lichtblick/suite-base/context/CurrentLayoutContext";
import { useLayoutManager } from "@lichtblick/suite-base/context/LayoutManagerContext";
import { useLayoutTransfer } from "@lichtblick/suite-base/hooks/useLayoutTransfer";

const log = Logger.getLogger(__filename);

/** Names that mean the same preset.
 *
 *  A preset gets renamed - 철도연_궤적시험 was made as uwb-position - and a
 *  browser that opened it before keeps its copy under the old name. That copy
 *  is never replaced and stays in the layout list, so picking it shows a
 *  version of the layout from before every edit since.
 *
 *  Compared without the separators, because that is what the renames in this
 *  archive change: a space becomes an underscore, or the other way round.
 */
export function sameName(a: string, b: string): boolean {
  const plain = (name: string) => name.replace(/[\s_-]+/g, "").toLowerCase();
  return plain(a) === plain(b);
}

/** What the archive calls this preset, or undefined if it cannot say. */
async function presetName(layoutUrl: URL, key: string): Promise<string | undefined> {
  try {
    const response = await fetch(new URL("/api/bootstrap/layouts", layoutUrl.origin).href, {
      cache: "no-store",
    });
    if (!response.ok) {
      return undefined;
    }
    const presets = (await response.json()) as { key: string; name: string }[];
    return presets.find((preset) => preset.key === key)?.name;
  } catch {
    // Falling back to the key still opens the layout, just under a plain name.
    return undefined;
  }
}

/** Fetch a layout preset and switch to it.
 *
 *  Lifted out of Workspace, which did this once at startup for the layoutUrl
 *  parameter. The app bar's layout picker does the same thing on every change,
 *  and installing a second copy each time — parseAndInstallLayout always saves
 *  a new one — would fill the layout list with duplicates.
 */
export function useLayoutFromUrl(): (layoutUrl: string) => Promise<void> {
  const layoutManager = useLayoutManager();
  const { setSelectedLayoutId } = useCurrentLayoutActions();
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
        // Never from the browser's cache. A preset is rewritten in place every
        // time somebody registers a layout, and a cached copy is how an edit
        // appears not to stick: the panel comes up with the settings that were
        // current an hour ago, and registering from there pushes them back over
        // the newer ones. The archive sends no-cache now, but a copy already in
        // the cache is still used without asking, so the header alone does not
        // rescue a browser that has one.
        const response = await fetch(layoutUrl, { cache: "no-store" });
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
        const key = dotIndex > 0 ? filename.slice(0, dotIndex) : filename;
        // The preset's own name, not the file it is stored under. The file is
        // named by key — layout-598b363a.json — and using that would both show
        // the wrong name in the picker and, because the name is what identifies
        // a preset on the way back, stop an edit from ever reaching the one it
        // came from.
        const layoutName = (await presetName(parsedUrl, key)) ?? key;

        // Find existing layouts with the same name before saving (safe
        // deduplication). The key counts as the same layout: a browser that
        // opened this preset before it was named properly holds one called
        // layout-598b363a, and leaving it there means two entries for one
        // preset, with the stale one still selectable.
        const existingLayouts = await layoutManager.getLayouts();
        const matchingLayouts = existingLayouts.filter(
          (layout) => sameName(layout.name, layoutName) || sameName(layout.name, key),
        );
        for (const layout of matchingLayouts) {
          if (layout.name !== layoutName) {
            log.info(`replacing an older copy of this preset, filed as "${layout.name}"`);
          }
        }

        // The layout is in hand before anything is removed, so there is no
        // window where a failed fetch leaves nothing behind.
        const text = await response.text();

        // Remove the old copy first. Installing over it and deleting after
        // left this browser's copy selected — the layout on screen stayed the
        // one from last time no matter what the archive had been told since.
        for (const layout of matchingLayouts) {
          await layoutManager.deleteLayout({ id: layout.id });
        }

        // Delegate JSON parsing and saving to parseAndInstallLayout
        const file = new File([text], `${layoutName}.json`, { type: "application/json" });
        const newLayout = await parseAndInstallLayout(file, "local");

        // Select it here rather than leaving it to the install. The install
        // fires its selection without waiting, and the layout being replaced
        // was the selected one — so the screen kept showing the copy that had
        // just been deleted while the new one sat in storage unused.
        if (newLayout) {
          setSelectedLayoutId(newLayout.id);
        }
      } catch (error) {
        log.error(`Could not load layout from ${safeUrlLabel}`, error);
        enqueueSnackbar("Failed to load layout from URL", { variant: "error" });
      }
    },
    [layoutManager, parseAndInstallLayout, setSelectedLayoutId, enqueueSnackbar],
  );
}
