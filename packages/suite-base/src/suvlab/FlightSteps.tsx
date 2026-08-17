// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { ChevronLeft16Regular, ChevronRight16Regular } from "@fluentui/react-icons";
import { IconButton, Tooltip } from "@mui/material";
import { makeStyles } from "tss-react/mui";

import { FlightStep } from "./flightInfo";

const useStyles = makeStyles()((theme) => ({
  button: {
    padding: theme.spacing(0.25),
    color: "inherit",
    flex: "none",

    "&.Mui-disabled": {
      color: "inherit",
      opacity: 0.25,
    },
  },
  icon: {
    fontSize: "16px !important",
  },
}));

/** Swap the log in the current address, keeping everything else.
 *
 *  The layout, and any other parameter the link was opened with, belong to how
 *  you are reading rather than to which flight you are reading - stepping to
 *  the next one should not reset them. The playhead is the exception: `time`
 *  names an instant inside the log being left, and carrying it into another
 *  one would seek to a moment that flight may not contain.
 */
export function stepTo(here: string, mcapUrl: string): string {
  const url = new URL(here);
  url.searchParams.set("ds.url", mcapUrl);
  url.searchParams.delete("time");
  return url.href;
}

/** One end of the day's flights, beside the name of the one on screen.
 *
 *  Reading one flight almost always means reading the others flown that day.
 *  Going back to the flight table to pick the next one loses the layout you
 *  had arranged and the place you were looking at.
 */
export function FlightStepButton({
  step,
  direction,
}: {
  step?: FlightStep;
  direction: "previous" | "next";
}): React.JSX.Element {
  const { classes } = useStyles();
  const back = direction === "previous";
  const label = back ? "이전 로그" : "다음 로그";

  return (
    <Tooltip title={step ? `${label}: ${step.filename}` : `${label} 없음`}>
      {/* A span because a disabled button fires no events, and a tooltip on one
          that never fires them never shows. */}
      <span>
        <IconButton
          className={classes.button}
          size="small"
          disabled={!step}
          data-testid={`flight-${direction}`}
          onClick={() => {
            if (step) {
              window.location.href = stepTo(window.location.href, step.url);
            }
          }}
        >
          {back ? (
            <ChevronLeft16Regular className={classes.icon} />
          ) : (
            <ChevronRight16Regular className={classes.icon} />
          )}
        </IconButton>
      </span>
    </Tooltip>
  );
}
