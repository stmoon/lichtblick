// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { useEffect, useMemo, useState } from "react";

import { Time, compare, subtract, toSec } from "@lichtblick/rostime";
import {
  MessagePipelineContext,
  useMessagePipeline,
} from "@lichtblick/suite-base/components/MessagePipeline";

export type PlaybackRange = {
  /** Where the scrubber starts and playback loops back to. */
  start: Time;
  /** Where playback stops. */
  end: Time;
  /** False while the range still covers the whole log. */
  adjusted: boolean;
};

const selectStartTime = (ctx: MessagePipelineContext) => ctx.playerState.activeData?.startTime;
const selectEndTime = (ctx: MessagePipelineContext) => ctx.playerState.activeData?.endTime;

/** A playback range over the log, defaulting to all of it.
 *
 *  Deliberately not in the workspace store: that store is persisted, and a
 *  range is a property of the log in front of you. Carrying one log's window
 *  over to the next would silently hide most of it.
 */
export function usePlaybackRange(): {
  range: PlaybackRange | undefined;
  /** The log's own bounds, whatever the range is set to. */
  bounds: { start: Time; end: Time } | undefined;
  setRange: (start: Time, end: Time) => void;
  reset: () => void;
} {
  const logStart = useMessagePipeline(selectStartTime);
  const logEnd = useMessagePipeline(selectEndTime);
  const [chosen, setChosen] = useState<{ start: Time; end: Time } | undefined>();

  // A different log means a different timeline, so the old window is
  // meaningless. Comparing the bounds rather than the source name also catches
  // a file being reloaded after it grew.
  useEffect(() => {
    setChosen(undefined);
  }, [logStart?.sec, logStart?.nsec, logEnd?.sec, logEnd?.nsec]);

  const bounds = useMemo(
    () => (logStart && logEnd ? { start: logStart, end: logEnd } : undefined),
    [logStart, logEnd],
  );

  const range = useMemo<PlaybackRange | undefined>(() => {
    if (!bounds) {
      return undefined;
    }
    if (!chosen) {
      return { ...bounds, adjusted: false };
    }
    // Clamp rather than reject: the log can be reloaded with different bounds
    // while a range is set, and a window hanging off the end would leave the
    // scrubber pointing at nothing.
    const start = compare(chosen.start, bounds.start) < 0 ? bounds.start : chosen.start;
    const end = compare(chosen.end, bounds.end) > 0 ? bounds.end : chosen.end;
    if (compare(start, end) >= 0) {
      return { ...bounds, adjusted: false };
    }
    return {
      start,
      end,
      adjusted: compare(start, bounds.start) !== 0 || compare(end, bounds.end) !== 0,
    };
  }, [bounds, chosen]);

  return useMemo(
    () => ({
      range,
      bounds,
      setRange: (start: Time, end: Time) => {
        setChosen({ start, end });
      },
      reset: () => {
        setChosen(undefined);
      },
    }),
    [range, bounds],
  );
}

/** How much the window changes the log's length, in seconds. Negative once it
 *  has been narrowed, which is the only direction it can go. */
export function rangeDelta(
  range: { start: Time; end: Time } | undefined,
  bounds: { start: Time; end: Time } | undefined,
): number {
  if (!range || !bounds) {
    return 0;
  }
  return toSec(subtract(range.end, range.start)) - toSec(subtract(bounds.end, bounds.start));
}
