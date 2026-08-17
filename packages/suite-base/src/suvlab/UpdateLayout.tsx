// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { ArrowUpload16Regular } from "@fluentui/react-icons";
import { CircularProgress, Tooltip } from "@mui/material";
import { useSnackbar } from "notistack";
import { useCallback, useState } from "react";
import { makeStyles } from "tss-react/mui";

import { useCurrentLayoutActions } from "@lichtblick/suite-base/context/CurrentLayoutContext";
import { useLayoutManager } from "@lichtblick/suite-base/context/LayoutManagerContext";
import { LayoutID } from "@lichtblick/suite-base/services/ILayoutManager";

import { useRegisterLayout } from "./shareLayout";

const useStyles = makeStyles()((theme) => ({
  button: {
    display: "inline-flex",
    alignItems: "center",
    gap: theme.spacing(0.5),
    background: "transparent",
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    color: "inherit",
    cursor: "pointer",
    font: "inherit",
    fontSize: theme.typography.caption.fontSize,
    lineHeight: 1.6,
    padding: theme.spacing(0, 0.75),
    whiteSpace: "nowrap",

    "&:hover": {
      backgroundColor: theme.palette.action.hover,
    },
    "&:disabled": {
      cursor: "default",
      opacity: 0.5,
    },
  },
  icon: {
    fontSize: "13px !important",
    opacity: 0.8,
  },
}));

/**
 * Put the layout on screen back into the archive, and save it here.
 *
 * The same two steps the layout list's "Register to Log Manager" does, moved
 * next to the layout's name because that is where you are looking when you have
 * just finished arranging panels. Both steps matter: registering alone says
 * "this is the shared version" while this browser keeps the copy from before
 * the edit, so reopening the log shows the old one - the preset's timestamp
 * moves and the screen does not.
 */
export function UpdateLayout(): React.JSX.Element | ReactNull {
  const { classes } = useStyles();
  const { getCurrentLayoutState } = useCurrentLayoutActions();
  const layoutManager = useLayoutManager();
  const register = useRegisterLayout();
  const { enqueueSnackbar } = useSnackbar();
  const [busy, setBusy] = useState(false);

  const update = useCallback(() => {
    void (async () => {
      const live = getCurrentLayoutState().selectedLayout;
      if (!live?.data) {
        enqueueSnackbar("먼저 레이아웃을 여십시오", { variant: "error" });
        return;
      }
      setBusy(true);
      try {
        // Read from the live state rather than from what the layout manager has
        // stored: that copy is written on a debounce, so registering right after
        // a change would send the version from a moment ago.
        const result = await register(live.name, live.data);
        if (result.ok) {
          await layoutManager.overwriteLayout({ id: live.id as LayoutID });
        }
        enqueueSnackbar(result.detail, { variant: result.ok ? "success" : "error" });
      } finally {
        setBusy(false);
      }
    })();
  }, [getCurrentLayoutState, layoutManager, register, enqueueSnackbar]);

  return (
    <Tooltip title="지금 화면의 레이아웃을 저장하고 Log Manager 프리셋에 반영합니다">
      <button className={classes.button} onClick={update} disabled={busy} type="button">
        {busy ? (
          <CircularProgress size={11} color="inherit" />
        ) : (
          <ArrowUpload16Regular className={classes.icon} />
        )}
        Update layout
      </button>
    </Tooltip>
  );
}
