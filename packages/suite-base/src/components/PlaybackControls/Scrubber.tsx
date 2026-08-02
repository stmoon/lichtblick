// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { Fade, PopperProps, Tooltip } from "@mui/material";
import type { Instance } from "@popperjs/core";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  /** The window playback is confined to. Undefined means the whole log. */
  range?: { start: Time; end: Time };
};

export default function Scrubber(props: Props): React.JSX.Element {
  const { onSeek, range } = props;
  const { classes, cx } = useStyles();

  const [hoverComponentId] = useState<string>(() => uuidv4());

  const logStartTime = useMessagePipeline(selectStartTime);
  const currentTime = useMessagePipeline(selectCurrentTime);
  const logEndTime = useMessagePipeline(selectEndTime);
  const presence = useMessagePipeline(selectPresence);
  const logRanges = useMessagePipeline(selectRanges);

  // The whole bar — track, hover, marker — is expressed as a fraction of
  // start..end, so narrowing the window is just a matter of what those two
  // are.
  const startTime = range?.start ?? logStartTime;
  const endTime = range?.end ?? logEndTime;

  // Loaded ranges arrive as fractions of the whole log. Left alone they would
  // shade the wrong part of a narrowed bar, which reads as data missing where
  // it is not.
  const ranges = useMemo(
    () => rescaleRanges(logRanges, logStartTime, logEndTime, startTime, endTime),
    [logRanges, logStartTime, logEndTime, startTime, endTime],
  );

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
        <EventsOverlay />
        <PlaybackBarHoverTicks componentId={hoverComponentId} />
      </Stack>
    </Tooltip>
  );
}

/** Move loaded-range fractions from the log's timeline onto the window's. */
function rescaleRanges(
  ranges: readonly { start: number; end: number }[] | undefined,
  logStart: Time | undefined,
  logEnd: Time | undefined,
  windowStart: Time | undefined,
  windowEnd: Time | undefined,
): { start: number; end: number }[] | undefined {
  if (!ranges || !logStart || !logEnd || !windowStart || !windowEnd) {
    return ranges as { start: number; end: number }[] | undefined;
  }
  const logSeconds = toSec(subtractTimes(logEnd, logStart));
  const windowSeconds = toSec(subtractTimes(windowEnd, windowStart));
  if (logSeconds <= 0 || windowSeconds <= 0) {
    return ranges as { start: number; end: number }[];
  }
  const offset = toSec(subtractTimes(windowStart, logStart));
  const move = (fraction: number) => (fraction * logSeconds - offset) / windowSeconds;
  const out: { start: number; end: number }[] = [];
  for (const range of ranges) {
    const start = Math.max(0, move(range.start));
    const end = Math.min(1, move(range.end));
    if (end > start) {
      out.push({ start, end });
    }
  }
  return out;
}
