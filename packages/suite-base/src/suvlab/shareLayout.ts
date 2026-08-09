// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { useCallback } from "react";

import {
  MessagePipelineContext,
  useMessagePipeline,
} from "@lichtblick/suite-base/components/MessagePipeline";

import { flightRef } from "./flightInfo";

const selectPlayerName = (ctx: MessagePipelineContext) => ctx.playerState.name;

const TOKEN_KEY = "flightlog.viewerToken";

/** Pack a payload as base64 of its gzip.
 *
 *  A layout carrying User Scripts is TypeScript source inside JSON, and the
 *  campus appliance in front of the archive answers such a request with a 302
 *  to its own page — the same interception that blocks PATCH and DELETE. The
 *  browser reports it as "Failed to fetch", so the layout never arrives and
 *  nothing says why. Packed, it goes through, and it is smaller besides.
 */
async function packed(payload: string): Promise<string> {
  const gzip = new Blob([payload]).stream().pipeThrough(new CompressionStream("gzip"));
  const bytes = new Uint8Array(await new Response(gzip).arrayBuffer());
  // In chunks: String.fromCharCode with a whole layout spread into arguments
  // overflows the stack.
  let binary = "";
  for (let at = 0; at < bytes.length; at += 8192) {
    binary += String.fromCharCode(...bytes.subarray(at, at + 8192));
  }
  return btoa(binary);
}

export type Registered = { ok: boolean; detail: string };

/** Send a layout to the archive as a shared preset, when asked to.
 *
 *  This used to happen on its own, four seconds after any edit, and that was
 *  worse than it sounds: the version sent was whichever the watcher happened
 *  to see, so merely opening a log could push the layout you started from back
 *  over the one you had just registered. Everyone shares these presets.
 *  Deciding when to overwrite one belongs to a person, not to a timer.
 */
export function useRegisterLayout(): (name: string, data: unknown) => Promise<Registered> {
  const playerSource = useMessagePipeline(selectPlayerName);

  return useCallback(
    async (name: string, data: unknown): Promise<Registered> => {
      const ref = flightRef(playerSource);
      if (!ref) {
        return { ok: false, detail: "로그를 연 상태에서만 등록할 수 있습니다" };
      }
      // Anonymous readers hold no token, so a shared link cannot rewrite what
      // it opens.
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) {
        return { ok: false, detail: "로그인한 뒤 로그를 열어야 등록할 수 있습니다" };
      }
      const payload = JSON.stringify({ name, data });
      if (payload == undefined) {
        return { ok: false, detail: "레이아웃을 읽지 못했습니다" };
      }
      try {
        const response = await fetch(`${ref.api}/api/bootstrap/layouts`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ gz: await packed(payload) }),
        });
        const reply = (await response.json().catch(() => undefined)) as
          | { added?: boolean; updated?: boolean; detail?: string }
          | undefined;
        if (!response.ok) {
          return { ok: false, detail: reply?.detail ?? `등록하지 못했습니다 (${response.status})` };
        }
        if (reply?.added !== true && reply?.updated !== true) {
          return { ok: false, detail: reply?.detail ?? "등록하지 못했습니다" };
        }
        return {
          ok: true,
          detail:
            reply.updated === true
              ? `'${name}' 프리셋을 갱신했습니다`
              : `'${name}' 프리셋을 추가했습니다`,
        };
      } catch (error) {
        return { ok: false, detail: `등록하지 못했습니다: ${String(error)}` };
      }
    },
    [playerSource],
  );
}
