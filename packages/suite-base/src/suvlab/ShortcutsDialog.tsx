// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { Dismiss20Regular } from "@fluentui/react-icons";
import { Dialog, DialogContent, DialogTitle, IconButton, Typography } from "@mui/material";
import { makeStyles } from "tss-react/mui";

import { useShortcutsDialog } from "./ShortcutsDialogContext";

const useStyles = makeStyles()((theme) => ({
  title: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing(2),
  },
  group: {
    marginTop: theme.spacing(2),

    "&:first-of-type": {
      marginTop: 0,
    },
  },
  heading: {
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(0.5),
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  key: {
    width: "9rem",
    padding: theme.spacing(0.5, 0),
    verticalAlign: "baseline",
    whiteSpace: "nowrap",
  },
  what: {
    padding: theme.spacing(0.5, 0),
    verticalAlign: "baseline",
  },
  kbd: {
    display: "inline-block",
    minWidth: "1.6em",
    padding: theme.spacing(0.25, 0.75),
    marginRight: theme.spacing(0.5),
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    backgroundColor: theme.palette.action.hover,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: theme.typography.caption.fontSize,
    textAlign: "center",
  },
}));

type Row = { keys: string[]; what: string };

/** Everything the viewer answers to, including what Lichtblick already had.
 *
 *  Split by what you are doing rather than by who wrote it: nobody pressing a
 *  key cares which half of the fork it came from.
 */
const GROUPS: { heading: string; rows: Row[] }[] = [
  {
    heading: "사이드바",
    rows: [
      { keys: ["["], what: "왼쪽 사이드바 열기/닫기" },
      { keys: ["]"], what: "오른쪽 사이드바 열기/닫기" },
      { keys: ["p"], what: "Panel 탭" },
      { keys: ["t"], what: "Topics 탭" },
      { keys: ["a"], what: "Alerts 탭" },
      { keys: ["l"], what: "Layouts 탭" },
      { keys: ["/"], what: "열린 탭의 검색창으로 커서 이동" },
    ],
  },
  {
    heading: "패널",
    rows: [
      { keys: ["1", "…", "9"], what: "타이틀 왼쪽 번호의 패널을 선택" },
      { keys: ["Cmd", "A"], what: "모든 패널 선택" },
      { keys: ["`"], what: "누르고 있으면 패널별 단축 동작" },
    ],
  },
  {
    heading: "재생",
    rows: [
      { keys: ["Space"], what: "재생 / 일시정지" },
      { keys: ["←"], what: "뒤로 이동" },
      { keys: ["→"], what: "앞으로 이동" },
    ],
  },
  {
    heading: "기타",
    rows: [
      { keys: ["?"], what: "이 목록" },
      { keys: ["Cmd", "O"], what: "파일 열기" },
    ],
  },
];

/** The shortcut list. Sidebar letters only work while the sidebar is open, and
 *  none of them fire while a text field has focus — both are noted rather than
 *  left for somebody to discover. */
export function ShortcutsDialog(): React.JSX.Element | ReactNull {
  const { classes } = useStyles();
  const state = useShortcutsDialog();

  if (!state?.open) {
    return ReactNull;
  }

  return (
    <Dialog
      open
      onClose={() => {
        state.setOpen(false);
      }}
      maxWidth="sm"
      fullWidth
      data-testid="shortcuts-dialog"
    >
      <DialogTitle className={classes.title}>
        단축키
        <IconButton
          onClick={() => {
            state.setOpen(false);
          }}
          edge="end"
          aria-label="닫기"
        >
          <Dismiss20Regular />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {GROUPS.map((group) => (
          <section key={group.heading} className={classes.group}>
            <Typography variant="overline" component="h3" className={classes.heading}>
              {group.heading}
            </Typography>
            <table className={classes.table}>
              <tbody>
                {group.rows.map((row) => (
                  <tr key={row.what}>
                    <td className={classes.key}>
                      {row.keys.map((key, index) =>
                        key === "…" ? (
                          <span key={index}>… </span>
                        ) : (
                          <kbd key={index} className={classes.kbd}>
                            {key}
                          </kbd>
                        ),
                      )}
                    </td>
                    <td className={classes.what}>
                      <Typography variant="body2">{row.what}</Typography>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
        <Typography variant="caption" color="text.secondary" component="p" marginTop={2}>
          글자 단축키는 검색창이나 입력칸에 커서가 있으면 동작하지 않습니다. 사이드바 탭 키는
          사이드바가 열려 있을 때만 듣습니다.
        </Typography>
      </DialogContent>
    </Dialog>
  );
}
