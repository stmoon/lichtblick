// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { useLayoutEffect } from "react";

import { compare, Time } from "@lichtblick/rostime";
import {
  MessagePipelineContext,
  useMessagePipeline,
} from "@lichtblick/suite-base/components/MessagePipeline";

type RepeatAdapterProps = {
  repeatEnabled: boolean;
  play: () => void;
  pause: () => void;
  seek: (to: Time) => void;
  /** The window playback is confined to. Undefined means the whole log. */
  range?: { start: Time; end: Time };
};

function activeDataSelector(ctx: MessagePipelineContext) {
  return ctx.playerState.activeData;
}

/**
 * RepeatAdapter handled looping from the start of playback when playback reaches the end
 *
 * It also enforces the playback range: the player itself knows nothing about a
 * narrowed window, so something has to stop it at the chosen end.
 *
 * NOTE: Because repeat adapter receives every message pipeline frame, we isolate its logic inside
 * a separate component so it does not cause virtual DOM diffing on any children.
 */
export function RepeatAdapter(props: RepeatAdapterProps): React.JSX.Element {
  const { play, pause, seek, repeatEnabled, range } = props;

  const activeData = useMessagePipeline(activeDataSelector);

  useLayoutEffect(() => {
    const currentTime = activeData?.currentTime;
    const startTime = range?.start ?? activeData?.startTime;
    const endTime = range?.end ?? activeData?.endTime;

    if (!startTime || !currentTime || !endTime) {
      return;
    }

    // Playing past a narrowed end has to be stopped even with repeat off,
    // otherwise the window would only be a suggestion.
    if (compare(currentTime, endTime) < 0) {
      return;
    }

    // repeat logic could also live in messagePipeline but since it is only triggered
    // from playback controls we've implemented it here for now - if there is demand
    // to toggle repeat from elsewhere this logic can move
    if (repeatEnabled) {
      seek(startTime);
      // if the user turns on repeat and we are at the end, we assume they want to play from start
      // even if paused
      play();
    } else if (range && activeData?.isPlaying === true) {
      pause();
      seek(endTime);
    }
  }, [activeData, pause, play, range, repeatEnabled, seek]);

  return <></>;
}
