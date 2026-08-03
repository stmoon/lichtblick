// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { makeStyles } from "tss-react/mui";

import { useSelectedPanels } from "@lichtblick/suite-base/context/CurrentLayoutContext";

import { usePanelNumber } from "./shortcuts";

const useStyles = makeStyles()((theme) => ({
  root: {
    flex: "none",
    minWidth: "1.5em",
    height: "1.5em",
    marginRight: theme.spacing(0.75),
    padding: 0,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    background: "transparent",
    color: theme.palette.text.secondary,
    cursor: "pointer",
    font: "inherit",
    fontSize: theme.typography.caption.fontSize,
    fontVariantNumeric: "tabular-nums",
    lineHeight: 1,

    "&:hover": {
      backgroundColor: theme.palette.action.hover,
    },
  },
  selected: {
    borderColor: theme.palette.primary.main,
    color: theme.palette.primary.main,
  },
}));

/** The key that reaches this panel, shown where it is useful — beside the
 *  title.
 *
 *  A button as well, because a number on screen that cannot be clicked is a
 *  puzzle for anyone who has not read the shortcut list.
 */
export function PanelNumber({ panelId }: { panelId?: string }): React.JSX.Element | ReactNull {
  const { classes, cx } = useStyles();
  const number = usePanelNumber(panelId);
  const { selectedPanelIds, setSelectedPanelIds } = useSelectedPanels();

  if (number == undefined || panelId == undefined) {
    return ReactNull;
  }

  return (
    <button
      type="button"
      className={cx(classes.root, {
        [classes.selected]: selectedPanelIds.includes(panelId),
      })}
      title={`이 패널 선택 (${number})`}
      data-testid={`panel-number-${number}`}
      onClick={(event) => {
        // The header is the mosaic drag handle; a click here is a selection,
        // not the start of a drag.
        event.stopPropagation();
        setSelectedPanelIds([panelId]);
      }}
    >
      {number}
    </button>
  );
}
