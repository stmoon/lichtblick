// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { useEffect, useRef } from "react";

import {
  MessagePipelineContext,
  useMessagePipeline,
} from "@lichtblick/suite-base/components/MessagePipeline";
import { useLayoutManager } from "@lichtblick/suite-base/context/LayoutManagerContext";

import { flightRef } from "./flightInfo";

const selectPlayerName = (ctx: MessagePipelineContext) => ctx.playerState.name;

/** How long the layout has to sit still before it is sent.
 *
 *  Dragging a panel emits a change per frame; without this the archive would
 *  see a request for each one.
 */
const QUIET_MS = 4000;

const TOKEN_KEY = "flightlog.viewerToken";

/** Offer a layout built here to the archive as a shared preset.
 *
 *  A layout lives in this browser's IndexedDB, so one built in the viewer is
 *  invisible to everyone else until it reaches the server. Watching the layout
 *  manager means nobody has to remember to export and upload it.
 *
 *  The archive refuses to overwrite an existing preset, which is what makes
 *  sending on every change safe: a layout opened from `default` keeps that
 *  name, and replacing everyone's default with one person's experiment is not
 *  something a background request should be able to do.
 */
export function useShareLayout(): void {
  const layoutManager = useLayoutManager();
  const playerSource = useMessagePipeline(selectPlayerName);
  // Names already offered, so a layout still being edited is sent once rather
  // than after every quiet spell.
  const sent = useRef(new Set<string>());

  useEffect(() => {
    const ref = flightRef(playerSource);
    if (!ref) {
      return;
    }
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      return;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;

    const offer = async () => {
      const layouts = await layoutManager.getLayouts();
      for (const item of layouts) {
        const data = item.working?.data ?? item.baseline.data;
        // Nothing to share until there is at least one panel.
        if (!data || Object.keys(data.configById ?? {}).length === 0) {
          continue;
        }
        if (sent.current.has(item.name)) {
          continue;
        }
        sent.current.add(item.name);
        try {
          await fetch(`${ref.api}/api/bootstrap/layouts`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ name: item.name, data }),
          });
        } catch {
          // The archive being unreachable is not this feature's problem to
          // report — the layout is still here, and the next change retries.
          sent.current.delete(item.name);
        }
      }
    };

    const onChange = () => {
      if (timer) {
        clearTimeout(timer);
      }
      timer = setTimeout(() => void offer(), QUIET_MS);
    };

    layoutManager.on("change", onChange);
    return () => {
      layoutManager.off("change", onChange);
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [layoutManager, playerSource]);
}
