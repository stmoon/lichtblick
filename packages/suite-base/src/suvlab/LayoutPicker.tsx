// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { ChevronDown12Regular } from "@fluentui/react-icons";
import { Menu, MenuItem } from "@mui/material";
import { useState } from "react";
import { makeStyles } from "tss-react/mui";

import { useArchive, useLayoutPresets } from "./flightInfo";
import { useLayoutFromUrl } from "./useLayoutFromUrl";

const useStyles = makeStyles()((theme) => ({
  button: {
    display: "inline-flex",
    alignItems: "center",
    gap: theme.spacing(0.25),
    background: "transparent",
    border: "none",
    borderRadius: theme.shape.borderRadius,
    color: "inherit",
    cursor: "pointer",
    font: "inherit",
    padding: theme.spacing(0, 0.5),

    "&:hover": {
      backgroundColor: theme.palette.action.hover,
    },
  },
  chevron: {
    fontSize: "10px !important",
    opacity: 0.7,
  },
}));

/** The layout presets, picked from the title bar.
 *
 *  The flight table already chooses one when a log is opened; this is for
 *  changing your mind without going back to the list and opening it again.
 *  It switches the view only — which preset a flight opens with stays the
 *  archive's to remember.
 */
export function LayoutPicker({ current }: { current?: string }): React.JSX.Element {
  const { classes } = useStyles();
  const api = useArchive();
  const presets = useLayoutPresets(api);
  const applyLayout = useLayoutFromUrl();

  const [anchor, setAnchor] = useState<HTMLElement | undefined>();
  const [chosen, setChosen] = useState<string | undefined>();

  const label = chosen ?? current ?? "Layout";

  return (
    <>
      <button
        type="button"
        className={classes.button}
        title="레이아웃 바꾸기"
        data-testid="layout-picker"
        disabled={presets.length === 0}
        onClick={(event) => {
          setAnchor(event.currentTarget);
        }}
      >
        {label}
        <ChevronDown12Regular className={classes.chevron} />
      </button>
      <Menu
        open={anchor != undefined}
        anchorEl={anchor}
        onClose={() => {
          setAnchor(undefined);
        }}
        slotProps={{ list: { dense: true } }}
      >
        {presets.map((preset) => (
          <MenuItem
            key={preset.key}
            selected={preset.name === label}
            onClick={() => {
              setAnchor(undefined);
              setChosen(preset.name);
              void applyLayout(preset.url);
            }}
          >
            {preset.name}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
