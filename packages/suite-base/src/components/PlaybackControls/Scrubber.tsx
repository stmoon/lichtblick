// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { Fade, PopperProps, Tooltip } from "@mui/material";
import type { Instance } from "@popperjs/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLatest } from "react-use";
import { makeStyles } from "tss-react/mui";
import { v4 as uuidv4 } from "uuid";

import {
  subtract as subtractTimes,
  add as addTimes,
  toSec,
  fromSec,
  Time,
} from "@lichtblick/rostime";
import {
  MessagePipelineContext,
  useMessagePipeline,
} from "@lichtblick/suite-base/components/MessagePipeline";
import Stack from "@lichtblick/suite-base/components/Stack";
import {
  useClearHoverValue,
  useSetHoverValue,
} from "@lichtblick/suite-base/context/TimelineInteractionStateContext";
import { PlayerPresence } from "@lichtblick/suite-base/players/types";
import BroadcastManager from "@lichtblick/suite-base/util/broadcast/BroadcastManager";

import { RangeBrackets } from "@lichtblick/suite-base/suvlab/RangeBrackets";
import { marked, nextMark } from "@lichtblick/suite-base/suvlab/loopKeys";

import { EventsOverlay } from "./EventsOverlay";
import PlaybackBarHoverTicks from "./PlaybackBarHoverTicks";
import { PlaybackControlsTooltipContent } from "./PlaybackControlsTooltipContent";
import { ProgressPlot } from "./ProgressPlot";
import Slider, { HoverOverEvent } from "./Slider";

const useStyles = makeStyles()((theme) => ({
  marker: {
    backgroundColor: theme.palette.text.primary,
    position: "absolute",
    height: 16,
    borderRadius: 1,
    width: 2,
    transform: "translate(-50%, 0)",
  },
  track: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: theme.palette.action.focus,
  },
  trackDisabled: {
    opacity: theme.palette.action.disabledOpacity,
  },
}));

const selectStartTime = (ctx: MessagePipelineContext) => ctx.playerState.activeData?.startTime;
const selectCurrentTime = (ctx: MessagePipelineContext) => ctx.playerState.activeData?.currentTime;
const selectEndTime = (ctx: MessagePipelineContext) => ctx.playerState.activeData?.endTime;
const selectRanges = (ctx: MessagePipelineContext) =>
  ctx.playerState.progress.fullyLoadedFractionRanges;
const selectPresence = (ctx: MessagePipelineContext) => ctx.playerState.presence;

type Props = {
  onSeek: (seekTo: Time) => void;
  /** The loop window, drawn as brackets over the bar. The bar itself always
   *  spans the whole log, so the window can be seen in proportion to it. */
  range?: { start: Time; end: Time };
  /** The log's own extent, which a mark outside the window falls back to. */
  bounds?: { start: Time; end: Time };
  onRangeChange?: (start: Time, end: Time) => void;
};

export default function Scrubber(props: Props): React.JSX.Element {
  const { onSeek, range, bounds, onRangeChange } = props;
  const { classes, cx } = useStyles();

  const [hoverComponentId] = useState<string>(() => uuidv4());

  const startTime = useMessagePipeline(selectStartTime);
  const currentTime = useMessagePipeline(selectCurrentTime);
  const endTime = useMessagePipeline(selectEndTime);
  const presence = useMessagePipeline(selectPresence);
  const ranges = useMessagePipeline(selectRanges);

  const setHoverValue = useSetHoverValue();

  type HoverInfo = {
    stamp: Time;
    clientX: number;
    clientY: number;
  };
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | undefined>();
  const latestHoverInfo = useLatest(hoverInfo);

  const latestStartTime = useLatest(startTime);
  const latestEndTime = useLatest(endTime);

  // Ctrl-click marks the loop window: once for where it starts, again for
  // where it ends, and the click after that starts a new one. Dragging the
  // brackets means aiming at a bar a few pixels tall, and the moment worth
  // marking is one you are watching for.
  const lastMark = useRef<"start" | "end" | undefined>(undefined);

  const markAt = useCallback(
    (event: MouseEvent) => {
      if (!(event.ctrlKey || event.metaKey) || !onRangeChange) {
        return;
      }
      const start = latestStartTime.current;
      const end = latestEndTime.current;
      if (!start || !end) {
        return;
      }
      // Not a seek as well: the click means "mark here", and jumping the
      // playhead there would move what you are watching.
      event.preventDefault();
      event.stopPropagation();

      const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
      const fraction = Math.min(Math.max((event.clientX - box.left) / box.width, 0), 1);
      const at = addTimes(
        start,
        fromSec(fraction * toSec(subtractTimes(end, start))),
      );
      const which = nextMark(lastMark.current);
      lastMark.current = which;
      const window = range ?? { start, end };
      const next = marked(which, at, window, bounds ?? { start, end });
      onRangeChange(next.start, next.end);
    },
    [bounds, latestEndTime, latestStartTime, onRangeChange, range],
  );

  const barRef = useRef<HTMLDivElement>(ReactNull);
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) {
      return;
    }
    // Captured on the way down, so the slider under it never starts a seek.
    // pointerdown is the one that matters - that is what the slider listens on,
    // and capturing only mouse events left the playhead jumping to the mark.
    const kinds = ["pointerdown", "mousedown", "click"];
    for (const kind of kinds) {
      bar.addEventListener(kind, markAt as EventListener, true);
    }
    return () => {
      for (const kind of kinds) {
        bar.removeEventListener(kind, markAt as EventListener, true);
      }
    };
  }, [markAt]);

  const onChange = useCallback(
    (fraction: number) => {
      if (!latestStartTime.current || !latestEndTime.current) {
        return;
      }
      const timeToSeek = addTimes(
        latestStartTime.current,
        fromSec(fraction * toSec(subtractTimes(latestEndTime.current, latestStartTime.current))),
      );
      onSeek(timeToSeek);
      BroadcastManager.getInstance().postMessage({
        type: "seek",
        time: timeToSeek,
      });
    },
    [onSeek, latestEndTime, latestStartTime],
  );

  const onHoverOver = useCallback(
    ({ fraction, clientX, clientY }: HoverOverEvent) => {
      if (!latestStartTime.current || !latestEndTime.current) {
        return;
      }
      const duration = toSec(subtractTimes(latestEndTime.current, latestStartTime.current));
      const timeFromStart = fromSec(fraction * duration);
      setHoverInfo({ stamp: addTimes(latestStartTime.current, timeFromStart), clientX, clientY });
      setHoverValue({
        componentId: hoverComponentId,
        type: "PLAYBACK_SECONDS",
        value: toSec(timeFromStart),
      });
    },
    [hoverComponentId, latestEndTime, latestStartTime, setHoverValue],
  );

  const clearHoverValue = useClearHoverValue();

  const onHoverOut = useCallback(() => {
    clearHoverValue(hoverComponentId);
    setHoverInfo(undefined);
  }, [clearHoverValue, hoverComponentId]);

  // Clean up the hover value when we are unmounted -- important for storybook.
  useEffect(() => onHoverOut, [onHoverOut]);

  const renderSlider = useCallback(
    (val?: number) => {
      if (val == undefined) {
        return undefined;
      }
      return <div className={classes.marker} style={{ left: `${val * 100}%` }} />;
    },
    [classes.marker],
  );

  const min = startTime && toSec(startTime);
  const max = endTime && toSec(endTime);
  const fraction =
    currentTime && startTime && endTime
      ? toSec(subtractTimes(currentTime, startTime)) / toSec(subtractTimes(endTime, startTime))
      : undefined;

  const loading = presence === PlayerPresence.INITIALIZING || presence === PlayerPresence.BUFFERING;

  const popperRef = React.useRef<Instance>(ReactNull);

  const isHovered = hoverInfo != undefined;
  const popperProps: Partial<PopperProps> = useMemo(
    () => ({
      open: isHovered, // Keep the tooltip visible while dragging even when the mouse is outside the playback bar
      popperRef,
      modifiers: [
        {
          name: "computeStyles",
          options: {
            gpuAcceleration: false, // Fixes hairline seam on arrow in chrome.
          },
        },
        {
          name: "offset",
          options: {
            // Offset popper to hug the track better.
            offset: [0, 4],
          },
        },
      ],
      anchorEl: {
        getBoundingClientRect: () => {
          return new DOMRect(
            latestHoverInfo.current?.clientX ?? 0,
            latestHoverInfo.current?.clientY ?? 0,
            0,
            0,
          );
        },
      },
    }),
    [isHovered, latestHoverInfo],
  );

  useEffect(() => {
    if (popperRef.current != undefined) {
      void popperRef.current.update();
    }
  }, [hoverInfo]);

  return (
    <Tooltip
      title={
        hoverInfo != undefined ? <PlaybackControlsTooltipContent stamp={hoverInfo.stamp} /> : ""
      }
      placement="top"
      disableInteractive
      slots={{ transition: Fade }}
      slotProps={{ transition: { timeout: 0 }, popper: popperProps }}
    >
      <Stack
        direction="row"
        flexGrow={1}
        alignItems="center"
        position="relative"
        style={{ height: 32 }}
        ref={barRef}
      >
        <div className={cx(classes.track, { [classes.trackDisabled]: !startTime })} />
        <Stack position="absolute" flex="auto" fullWidth style={{ height: 6 }}>
          <ProgressPlot loading={loading} availableRanges={ranges} />
        </Stack>
        <Stack fullHeight fullWidth position="absolute" flex={1} data-testid="playback-slider">
          <Slider
            disabled={min == undefined || max == undefined}
            fraction={fraction}
            onHoverOver={onHoverOver}
            onHoverOut={onHoverOut}
            onChange={onChange}
            renderSlider={renderSlider}
          />
        </Stack>
        {range && startTime && endTime && onRangeChange && (
          <RangeBrackets
            start={toFraction(range.start, startTime, endTime)}
            end={toFraction(range.end, startTime, endTime)}
            onChange={(from, to) => {
              onRangeChange(
                atFraction(from, startTime, endTime),
                atFraction(to, startTime, endTime),
              );
            }}
          />
        )}
        <EventsOverlay />
        <PlaybackBarHoverTicks componentId={hoverComponentId} />
      </Stack>
    </Tooltip>
  );
}

function toFraction(time: Time, start: Time, end: Time): number {
  const span = toSec(subtractTimes(end, start));
  return span > 0 ? toSec(subtractTimes(time, start)) / span : 0;
}

function atFraction(fraction: number, start: Time, end: Time): Time {
  return addTimes(start, fromSec(fraction * toSec(subtractTimes(end, start))));
}
