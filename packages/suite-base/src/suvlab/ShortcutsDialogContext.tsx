// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { createContext, useContext, useMemo, useState } from "react";

type ShortcutsDialogState = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

/** Whether the shortcut list is showing.
 *
 *  Two places ask for it — the Help menu and the "?" key — and they sit on
 *  opposite sides of the workspace tree. A context is cheaper than threading a
 *  callback through the app bar, and lighter than a key in the workspace store,
 *  which is persisted and migrated and has no business remembering this.
 */
const ShortcutsDialogContext = createContext<ShortcutsDialogState | undefined>(undefined);

export function ShortcutsDialogProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const value = useMemo(() => ({ open, setOpen }), [open]);
  return (
    <ShortcutsDialogContext.Provider value={value}>{children}</ShortcutsDialogContext.Provider>
  );
}

/** Undefined outside the provider, which is how the app bar's stories and
 *  tests render without one. */
export function useShortcutsDialog(): ShortcutsDialogState | undefined {
  return useContext(ShortcutsDialogContext);
}
