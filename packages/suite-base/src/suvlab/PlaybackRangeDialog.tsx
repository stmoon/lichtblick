// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { Close20Regular } from "@fluentui/react-icons";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Typography,
} from "@mui/material";
import { useMemo, useState } from "react";
import { makeStyles } from "tss-react/mui";

import { Time, compare, isTimeInRangeInclusive } from "@lichtblick/rostime";
import Stack from "@lichtblick/suite-base/components/Stack";
import { useAppTimeFormat } from "@lichtblick/suite-base/hooks/useAppTimeFormat";
import { getValidatedTimeAndMethodFromString } from "@lichtblick/suite-base/util/formatTime";

import { PlaybackRange, rangeShortfall } from "./playbackRange";

const useStyles = makeStyles()((theme) => ({
  title: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing(2),
  },
  fields: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: theme.spacing(3),
    paddingTop: theme.spacing(1),
  },
  actions: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing(2),
    paddingInline: theme.spacing(3),
  },
  shortfall: {
    fontVariantNumeric: "tabular-nums",
  },
}));

type Props = {
  open: boolean;
  onClose: () => void;
  range: PlaybackRange;
  bounds: { start: Time; end: Time };
  onApply: (start: Time, end: Time) => void;
  onReset: () => void;
};

/** Written the way the playback time display writes it, so a value copied out
 *  of the toolbar can be pasted straight back in. */
function useTimeText(): (time: Time) => string {
  const { formatDate, formatTime } = useAppTimeFormat();
  return useMemo(
    () => (time: Time) => `${formatDate(time)} ${formatTime(time)}`,
    [formatDate, formatTime],
  );
}

export function PlaybackRangeDialog({
  open,
  onClose,
  range,
  bounds,
  onApply,
  onReset,
}: Props): React.JSX.Element {
  const { classes } = useStyles();
  const { timeZone } = useAppTimeFormat();
  const asText = useTimeText();

  const [startText, setStartText] = useState(() => asText(range.start));
  const [endText, setEndText] = useState(() => asText(range.end));

  const parse = (text: string): Time | undefined => {
    const parsed = getValidatedTimeAndMethodFromString({ text, timezone: timeZone });
    const time = parsed?.time;
    // Outside the log is not a range, it is a typo. Rejecting here keeps the
    // error next to the field that caused it.
    return time && isTimeInRangeInclusive(time, bounds.start, bounds.end) ? time : undefined;
  };

  const start = parse(startText);
  const end = parse(endText);
  const ordered = start != undefined && end != undefined && compare(start, end) < 0;

  const shortfall = ordered
    ? rangeShortfall({ start: start!, end: end!, adjusted: true }, bounds)
    : rangeShortfall(range, bounds);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle className={classes.title}>
        Adjust playback range
        <IconButton onClick={onClose} edge="end" aria-label="Close">
          <Close20Regular />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <div className={classes.fields}>
          <TextField
            label="Range start"
            variant="filled"
            fullWidth
            value={startText}
            error={start == undefined}
            helperText={start == undefined ? "로그 구간 안의 시각이어야 합니다" : " "}
            onChange={(event) => {
              setStartText(event.target.value);
            }}
          />
          <TextField
            label="Range end"
            variant="filled"
            fullWidth
            value={endText}
            error={end == undefined || !ordered}
            helperText={
              end == undefined
                ? "로그 구간 안의 시각이어야 합니다"
                : !ordered
                  ? "시작보다 뒤여야 합니다"
                  : " "
            }
            onChange={(event) => {
              setEndText(event.target.value);
            }}
          />
        </div>
      </DialogContent>
      <DialogActions className={classes.actions}>
        <Typography variant="body2" color="text.secondary" className={classes.shortfall}>
          Duration adjustment: {formatShortfall(shortfall)}
        </Typography>
        <Stack direction="row" gap={1}>
          {range.adjusted && (
            <Button
              onClick={() => {
                onReset();
                onClose();
              }}
            >
              Reset
            </Button>
          )}
          <Button variant="outlined" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!ordered}
            onClick={() => {
              if (ordered) {
                onApply(start!, end!);
                onClose();
              }
            }}
          >
            Update
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}

function formatShortfall(time: Time): string {
  const total = Math.max(0, time.sec);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const millis = Math.round(Math.max(0, time.nsec) / 1e6);
  return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(
    millis,
  ).padStart(3, "0")}`;
}
