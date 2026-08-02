// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { Tooltip } from "@mui/material";
import { makeStyles } from "tss-react/mui";

import { LayoutPicker } from "./LayoutPicker";
import { FlightInfo, formatDuration, formatSize } from "./flightInfo";

const useStyles = makeStyles()((theme) => ({
  root: {
    display: "flex",
    alignItems: "baseline",
    gap: theme.spacing(1),
    minWidth: 0,
    font: "inherit",
    fontSize: theme.typography.body2.fontSize,
    padding: theme.spacing(0, 1),
    whiteSpace: "nowrap",
  },
  filename: {
    fontWeight: 600,
    overflow: "hidden",
    textOverflow: "ellipsis",
    minWidth: 0,
  },
  facts: {
    display: "flex",
    alignItems: "baseline",
    gap: theme.spacing(0.75),
    opacity: 0.7,
    minWidth: 0,
    overflow: "hidden",
  },
  separator: {
    opacity: 0.45,
  },
  // The two numbers line up between logs, which is the point of showing them.
  numeric: {
    fontVariantNumeric: "tabular-nums",
  },
}));

/** The app bar's middle: what this log is, rather than where its bytes live.
 *
 *  The blob URL it replaces was a path with a uuid in it — technically the
 *  answer to "which file", useless as an answer to "which flight".
 */
export function FlightTitle({ info }: { info: FlightInfo }): React.JSX.Element {
  const { classes } = useStyles();

  const facts = [
    info.startedLabel ?? info.flightDate,
    info.experiment,
    info.uploadedByName,
    info.droneId,
    formatDuration(info.durationS),
    formatSize(info.sizeBytes),
  ].filter((fact): fact is string => Boolean(fact));

  return (
    <Tooltip title={info.filename} placement="bottom">
      <div className={classes.root} data-testid="flight-title">
        <span className={classes.filename}>{info.filename}</span>
        <span className={classes.facts}>
          {facts.map((fact, index) => (
            <span key={fact + String(index)} className={classes.numeric}>
              {index > 0 && <span className={classes.separator}>{"· "}</span>}
              {fact}
            </span>
          ))}
          {/* Last, and a control rather than a fact: it is the one thing here
              you can change. */}
          <span>
            <span className={classes.separator}>{"· "}</span>
            <LayoutPicker current={info.layoutName} />
          </span>
        </span>
      </div>
    </Tooltip>
  );
}
