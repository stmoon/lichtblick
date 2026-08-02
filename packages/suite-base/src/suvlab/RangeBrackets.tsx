// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { useCallback, useRef, useState } from "react";
import { makeStyles } from "tss-react/mui";

/** Never let the two handles meet: a zero-width window has nothing to play and
 *  no way to grab either handle back apart. */
const MIN_SPAN = 0.005;

const useStyles = makeStyles()((theme) => ({
  // The bar underneath still handles clicks to seek, so this layer only takes
  // pointer events on the handles themselves.
  root: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
  },
  excluded: {
    position: "absolute",
    top: 0,
    bottom: 0,
    backgroundColor: theme.palette.background.default,
    opacity: 0.62,
  },
  handle: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 11,
    marginLeft: -5.5,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "ew-resize",
    pointerEvents: "auto",
    // Touch scrolling would otherwise steal the drag on a laptop trackpad.
    touchAction: "none",
    color: theme.palette.text.primary,
    fontSize: 15,
    lineHeight: 1,
    fontWeight: 700,
    userSelect: "none",
  },
  handleActive: {
    color: theme.palette.primary.main,
  },
}));

type Props = {
  /** Both as a fraction of the whole log, 0 at its start and 1 at its end. */
  start: number;
  end: number;
  onChange: (start: number, end: number) => void;
};

/** The `[` and `]` of the loop window, dragged directly on the playback bar.
 *
 *  Typing two timestamps into a dialog is exact but slow, and picking a stretch
 *  of a flight to watch again is something you do by eye.
 */
export function RangeBrackets({ start, end, onChange }: Props): React.JSX.Element {
  const { classes, cx } = useStyles();
  const rootRef = useRef<HTMLDivElement>(ReactNull);
  const [dragging, setDragging] = useState<"start" | "end" | undefined>();

  const drag = useCallback(
    (which: "start" | "end") => (event: React.PointerEvent<HTMLDivElement>) => {
      // Without this the bar underneath takes the press as a seek, and the
      // playhead jumps to wherever the handle happened to be.
      event.preventDefault();
      event.stopPropagation();
      const element = event.currentTarget;
      element.setPointerCapture(event.pointerId);
      setDragging(which);

      const move = (moveEvent: PointerEvent) => {
        const box = rootRef.current?.getBoundingClientRect();
        if (!box || box.width === 0) {
          return;
        }
        const at = Math.min(1, Math.max(0, (moveEvent.clientX - box.left) / box.width));
        if (which === "start") {
          onChange(Math.min(at, end - MIN_SPAN), end);
        } else {
          onChange(start, Math.max(at, start + MIN_SPAN));
        }
      };
      const up = () => {
        setDragging(undefined);
        element.removeEventListener("pointermove", move);
        element.removeEventListener("pointerup", up);
        element.removeEventListener("pointercancel", up);
      };
      element.addEventListener("pointermove", move);
      element.addEventListener("pointerup", up);
      element.addEventListener("pointercancel", up);
    },
    [end, onChange, start],
  );

  return (
    <div ref={rootRef} className={classes.root}>
      <div className={classes.excluded} style={{ left: 0, width: `${start * 100}%` }} />
      <div className={classes.excluded} style={{ left: `${end * 100}%`, right: 0 }} />
      <div
        className={cx(classes.handle, { [classes.handleActive]: dragging === "start" })}
        style={{ left: `${start * 100}%` }}
        onPointerDown={drag("start")}
        title="Loop start"
        data-testid="range-handle-start"
      >
        {"["}
      </div>
      <div
        className={cx(classes.handle, { [classes.handleActive]: dragging === "end" })}
        style={{ left: `${end * 100}%` }}
        onPointerDown={drag("end")}
        title="Loop end"
        data-testid="range-handle-end"
      >
        {"]"}
      </div>
    </div>
  );
}
