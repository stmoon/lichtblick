// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { useMemo } from "react";

import KeyListener from "@lichtblick/suite-base/components/KeyListener";
import { useSelectedPanels } from "@lichtblick/suite-base/context/CurrentLayoutContext";
import {
  LeftSidebarItemKey,
  WorkspaceContextStore,
  useWorkspaceStore,
} from "@lichtblick/suite-base/context/Workspace/WorkspaceContext";
import { useWorkspaceActions } from "@lichtblick/suite-base/context/Workspace/useWorkspaceActions";

import { isPlainKey, usePanelOrder } from "./shortcuts";

/** Which tab each letter opens. The initial of the tab's own name, so there is
 *  nothing to memorise beyond what is already on screen. */
const TABS: Record<string, LeftSidebarItemKey> = {
  p: "panel-settings",
  t: "topics",
  a: "alerts",
  l: "layouts",
};

/** The search box of whichever tab is showing.
 *
 *  Every left sidebar tab has one, but they are different components: the
 *  settings tree builds its id from its variant, the topic list uses a
 *  SearchBar, the layout browser its own field. Rather than name all three,
 *  take the first text input in the pane — there is only ever one.
 *
 *  Note the settings filter only exists for panels that ask for it
 *  (SettingsTree.enableFilter); on a panel without one there is nothing to
 *  focus and the key does nothing.
 */
const SIDEBAR_SEARCH =
  '[data-testid="sidebar-left"] input[type="text"], [data-testid="sidebar-left"] input:not([type])';

const selectLeftOpen = (store: WorkspaceContextStore) => store.sidebars.left.open;

/** Keys for the things that otherwise need a mouse.
 *
 *  Deliberately unmodified letters: the viewer is read with one hand on the
 *  playback keys, and a chord defeats the point. KeyListener already declines
 *  to fire while a text field has focus, which is what makes bare letters safe.
 */
export function Shortcuts(): React.JSX.Element {
  const leftOpen = useWorkspaceStore(selectLeftOpen);
  const { sidebarActions } = useWorkspaceActions();
  const { setSelectedPanelIds } = useSelectedPanels();
  const panelOrder = usePanelOrder();

  const handlers = useMemo(() => {
    const out: Record<string, (event: KeyboardEvent) => void | boolean> = {};

    for (const [key, tab] of Object.entries(TABS)) {
      out[key] = (event) => {
        // Only while the sidebar is showing: with it closed these letters
        // belong to whatever the panels want them for.
        if (!isPlainKey(event) || !leftOpen) {
          return false;
        }
        sidebarActions.left.selectItem(tab);
        return true;
      };
    }

    out["/"] = (event) => {
      if (!isPlainKey(event) || !leftOpen) {
        return false;
      }
      const search = document.querySelector(SIDEBAR_SEARCH);
      if (!(search instanceof HTMLInputElement)) {
        return false;
      }
      search.focus();
      search.select();
      return true;
    };

    for (let n = 1; n <= panelOrder.length && n <= 9; n++) {
      out[String(n)] = (event) => {
        if (!isPlainKey(event)) {
          return false;
        }
        const id = panelOrder[n - 1];
        if (id == undefined) {
          return false;
        }
        setSelectedPanelIds([id]);
        return true;
      };
    }

    return out;
  }, [leftOpen, panelOrder, setSelectedPanelIds, sidebarActions.left]);

  return <KeyListener global keyDownHandlers={handlers} />;
}
