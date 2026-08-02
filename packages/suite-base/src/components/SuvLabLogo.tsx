// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import mark from "@lichtblick/suite-base/assets/suvlab-mark.png";

/** The app bar mark.
 *
 *  A raster rather than an SvgIcon, because the artwork is a rendered image
 *  and has no vector form. It is sized in em so the callers that set a font
 *  size on the surrounding button keep working.
 */
export function SuvLabLogo({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}): React.JSX.Element {
  return (
    <img
      src={mark}
      alt="SUV Lab"
      className={className}
      style={{ width: "1em", height: "1em", display: "block", ...style }}
    />
  );
}
