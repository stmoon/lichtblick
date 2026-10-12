// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/** Downloading the recording the viewer is showing.
 *
 *  The file is whatever the player was opened with, so the download is the
 *  URL it is already streaming from rather than anything rebuilt here: a
 *  recording runs to gigabytes, and gathering one in memory to hand it back
 *  would cost the browser what the player deliberately never spends.
 */

/** The address the recording is being read from, when it is a URL at all.
 *  A log opened from disk has nothing to download. */
export function sourceUrl(playerName: string | undefined): string | undefined {
  const name = playerName?.trim();
  return name && /^https?:\/\//i.test(name) ? name : undefined;
}

const BAD = /[\\/:*?"<>|]+/g;
const RECORDING = /\.(mcap|ulg|bag|db3)$/i;

/** What to call the saved file: the name the archive gives the log, or the
 *  last part of the URL. Always .mcap — that is what the viewer holds, even
 *  for a log the archive took in as a ULog. */
export function downloadName(url: string, title: string | undefined): string {
  const fromUrl = decodeURIComponent(url.split(/[?#]/)[0] ?? "").split("/").pop() ?? "";
  const base = (title?.trim() ?? "") || fromUrl || "recording";
  const named = base.replace(BAD, "_").replace(RECORDING, "");
  return `${named}.mcap`;
}

/** Save the recording through the browser, named for the log.
 *
 *  An anchor rather than a fetch: the browser streams the body to disk on its
 *  own, with its progress and its resume, and nothing passes through here. */
export function downloadSource(url: string, title: string | undefined): void {
  const link = document.createElement("a");
  link.href = url;
  // Honoured for a file served from this origin, which is where the archive
  // serves the viewer from; cross-origin the server's own name is used.
  link.download = downloadName(url, title);
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
}
