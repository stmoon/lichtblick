// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { useMemo } from "react";
import { getLeaves } from "react-mosaic-component";

import {
  LayoutState,
  useCurrentLayoutSelector,
} from "@lichtblick/suite-base/context/CurrentLayoutContext";

/** As many panels as there are digits to reach them with. */
export const MAX_NUMBERED_PANELS = 9;

const selectPanelIds = (state: LayoutState) =>
  getLeaves(state.selectedLayout?.data?.layout ?? ReactNull);

/** Every open panel, in the order react-mosaic lays them out.
 *
 *  That order is the tree's own — first branch before second — which reads
 *  left to right and top to bottom on screen, so the numbers follow the eye.
 */
export function usePanelOrder(): string[] {
  const ids = useCurrentLayoutSelector(selectPanelIds);
  // The selector builds a new array each time the layout object changes, so
  // memoising on the joined ids keeps consumers from re-rendering on every
  // unrelated layout write.
  const key = ids.join(",");
  return useMemo(() => (key === "" ? [] : key.split(",")), [key]);
}

/** The number shown beside a panel's title, or undefined past the ninth.
 *
 *  Undefined rather than a tenth badge: there is no key to press for it, and a
 *  number you cannot use is worse than none.
 */
export function usePanelNumber(panelId: string | undefined): number | undefined {
  const order = usePanelOrder();
  if (panelId == undefined) {
    return undefined;
  }
  const index = order.indexOf(panelId);
  return index >= 0 && index < MAX_NUMBERED_PANELS ? index + 1 : undefined;
}

/** True when the keystroke is a plain letter, not part of a chord.
 *
 *  Cmd+A already selects every panel and Cmd+O opens a file; a bare letter
 *  shortcut must not answer for those.
 */
export function isPlainKey(event: KeyboardEvent): boolean {
  return !event.ctrlKey && !event.metaKey && !event.altKey;
}
