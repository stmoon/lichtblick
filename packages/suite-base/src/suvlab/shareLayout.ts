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

/** Send a layout built or edited here to the archive as a shared preset.
 *
 *  A layout lives in this browser's IndexedDB, so one built in the viewer is
 *  invisible to everyone else until it reaches the server. Watching the layout
 *  manager means nobody has to remember to export and upload it.
 *
 *  A layout keeps the name of the preset it was opened from, so an edit lands
 *  on that preset and everyone sees it. Only a signed-in viewer holds a token,
 *  so opening a shared link changes nothing for anyone else.
 */
export function useShareLayout(): void {
  const layoutManager = useLayoutManager();
  const playerSource = useMessagePipeline(selectPlayerName);
  // What was last sent under each name. Keyed by content, not just by name:
  // sending once per name would make the first edit of a session stick and
  // every one after it vanish.
  const sent = useRef(new Map<string, string>());
  // Read when the timer fires rather than captured when it is set. A large
  // recording renames its player several times while it loads, and depending
  // on that here meant every rename tore this effect down — taking the pending
  // send with it. Edits to a small log arrived; edits to a big one never did.
  const source = useRef(playerSource);
  source.current = playerSource;

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const offer = async () => {
      const ref = flightRef(source.current);
      const token = localStorage.getItem(TOKEN_KEY);
      if (!ref || !token) {
        return;
      }
      const layouts = await layoutManager.getLayouts();
      for (const item of layouts) {
        const data = item.working?.data ?? item.baseline.data;
        // Nothing to share until there is at least one panel.
        if (!data || Object.keys(data.configById ?? {}).length === 0) {
          continue;
        }
        const body = JSON.stringify({ name: item.name, data });
        if (body == undefined || sent.current.get(item.name) === body) {
          continue;
        }
        sent.current.set(item.name, body);
        try {
          await fetch(`${ref.api}/api/bootstrap/layouts`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body,
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
  }, [layoutManager]);
}
