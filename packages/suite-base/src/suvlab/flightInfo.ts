// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { useEffect, useState } from "react";

import {
  MessagePipelineContext,
  useMessagePipeline,
} from "@lichtblick/suite-base/components/MessagePipeline";

/** What the Flight Log Manager knows about the log being viewed. */
export type FlightInfo = {
  id: string;
  filename: string;
  flightDate: string;
  startedLabel?: string;
  durationS?: number;
  sizeBytes?: number;
  experiment?: string;
  uploadedByName?: string;
  droneId?: string;
  layoutName?: string;
  notionPageId?: string;
  notionUrl?: string;
};

/** The archive origin and flight id, read out of the blob URL.
 *
 *  No extra plumbing: the URL the viewer was opened with already names both,
 *  and the archive serves its API from the same origin as its blobs. Anything
 *  else — a query parameter, a value stashed in localStorage — would be one
 *  more thing to keep in sync with a link someone pasted into chat.
 */
const BLOB = /^(https?:\/\/[^/]+)\/(?:f\/[^/]+|files)\/([0-9a-f-]{36})\.mcap(?:$|[?#])/i;

export function flightRef(source: string | undefined): { api: string; id: string } | undefined {
  if (!source) {
    return undefined;
  }
  const match = BLOB.exec(source.trim());
  if (!match?.[1] || !match[2]) {
    return undefined;
  }
  return { api: match[1], id: match[2] };
}

type Raw = {
  id: string;
  filename: string;
  flight_date: string;
  started_label?: string | null;
  duration_s?: number | null;
  size_bytes?: number | null;
  experiment?: string | null;
  uploaded_by_name?: string | null;
  drone_id?: string | null;
  layout_name?: string | null;
  notion_page_id?: string | null;
  notion_url?: string | null;
};

function shape(raw: Raw): FlightInfo {
  return {
    id: raw.id,
    filename: raw.filename,
    flightDate: raw.flight_date,
    startedLabel: raw.started_label ?? undefined,
    durationS: raw.duration_s ?? undefined,
    sizeBytes: raw.size_bytes ?? undefined,
    experiment: raw.experiment ?? undefined,
    uploadedByName: raw.uploaded_by_name ?? undefined,
    droneId: raw.drone_id ?? undefined,
    layoutName: raw.layout_name ?? undefined,
    notionPageId: raw.notion_page_id ?? undefined,
    notionUrl: raw.notion_url ?? undefined,
  };
}

// One fetch per log, shared by every component that asks. The app bar and the
// document title both want this, and neither should trigger its own request.
const cache = new Map<string, Promise<FlightInfo | undefined>>();

export async function fetchFlightInfo(api: string, id: string): Promise<FlightInfo | undefined> {
  const key = `${api}/${id}`;
  let pending = cache.get(key);
  if (!pending) {
    pending = fetch(`${api}/api/bootstrap/flight/${id}`)
      .then(async (response) => (response.ok ? shape((await response.json()) as Raw) : undefined))
      // A log opened straight from a file, or an archive that is down: the
      // caller falls back to the URL rather than showing an error in a title.
      .catch(() => undefined);
    cache.set(key, pending);
  }
  return await pending;
}

const selectPlayerName = (ctx: MessagePipelineContext) => ctx.playerState.name;

export function useFlightInfo(): FlightInfo | undefined {
  const playerName = useMessagePipeline(selectPlayerName);
  const [info, setInfo] = useState<FlightInfo | undefined>();

  useEffect(() => {
    const ref = flightRef(playerName);
    if (!ref) {
      setInfo(undefined);
      return;
    }
    let live = true;
    void fetchFlightInfo(ref.api, ref.id).then((found) => {
      if (live) {
        setInfo(found);
      }
    });
    return () => {
      live = false;
    };
  }, [playerName]);

  return info;
}

/** Flight length as m:ss, the way the flight table writes it. */
export function formatDuration(seconds: number | undefined): string | undefined {
  if (seconds == undefined || !Number.isFinite(seconds)) {
    return undefined;
  }
  const whole = Math.round(seconds);
  const minutes = Math.floor(whole / 60);
  return `${minutes}:${String(whole % 60).padStart(2, "0")}`;
}

export function formatSize(bytes: number | undefined): string | undefined {
  if (bytes == undefined || !Number.isFinite(bytes)) {
    return undefined;
  }
  const mb = bytes / 1024 / 1024;
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(1)} MB`;
}
