// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { useCallback, useState } from "react";

import {
  UserScriptEditor,
  defaultConfig,
} from "@lichtblick/suite-base/panels/UserScriptEditor";
import Config from "@lichtblick/suite-base/panels/UserScriptEditor/Config";

/** The script editor, in the right sidebar rather than the layout.
 *
 *  A script is something you write once and then read topics from for the rest
 *  of the session; giving it a tile in the layout costs the space you wanted
 *  the plots in. The sidebar opens over the layout and closes again.
 *
 *  The scripts themselves live in the layout, not here — this holds only which
 *  one is open and whether to format on save, which is why plain state is
 *  enough. Closing the sidebar forgets the selection and nothing else.
 */
export function UserScriptsSidebar(): React.JSX.Element {
  const [config, setConfig] = useState<Config>(defaultConfig);

  const saveConfig = useCallback((change: Partial<Config> | ((old: Config) => Partial<Config>)) => {
    setConfig((old) => ({ ...old, ...(typeof change === "function" ? change(old) : change) }));
  }, []);

  return <UserScriptEditor config={config} saveConfig={saveConfig} panelChrome={false} />;
}
