import * as React from "react"

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number
}

function makeIcon(paths: React.ReactNode, viewBox = "0 0 24 24") {
  return function Icon({ size = 16, ...props }: IconProps) {
    return (
      <svg
        width={size}
        height={size}
        viewBox={viewBox}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
      >
        {paths}
      </svg>
    )
  }
}

export const BoldIcon = makeIcon(
  <>
    <path d="M6 4h6a3.5 3.5 0 0 1 0 7H6z" />
    <path d="M6 11h7a3.5 3.5 0 0 1 0 7H6z" />
  </>
)

export const ItalicIcon = makeIcon(
  <>
    <line x1="10" y1="4" x2="18" y2="4" />
    <line x1="6" y1="20" x2="14" y2="20" />
    <line x1="14" y1="4" x2="10" y2="20" />
  </>
)

export const UnderlineIcon = makeIcon(
  <>
    <path d="M6 4v6a6 6 0 0 0 12 0V4" />
    <line x1="4" y1="20" x2="20" y2="20" />
  </>
)

export const StrikeIcon = makeIcon(
  <>
    <path d="M6 8c0-2 2-4 6-4s6 1.5 6 3.5" />
    <path d="M6 16c0 2 2 4 6 4s6-1.5 6-3.5" />
    <line x1="3" y1="12" x2="21" y2="12" />
  </>
)

export const CodeIcon = makeIcon(
  <>
    <polyline points="9 8 4 12 9 16" />
    <polyline points="15 8 20 12 15 16" />
  </>
)

export const HighlightIcon = makeIcon(
  <>
    <path d="M4 20l3-3 9-9 3 3-9 9-3 3z" />
    <path d="M13 8l3 3" />
  </>
)

export const Heading1Icon = makeIcon(
  <>
    <path d="M4 6v12M12 6v12M4 12h8" />
    <path d="M17 10l3-2v8" />
  </>
)

export const Heading2Icon = makeIcon(
  <>
    <path d="M4 6v12M12 6v12M4 12h8" />
    <path d="M16 10a2 2 0 1 1 4 1c0 1.5-4 2-4 5h4" />
  </>
)

export const Heading3Icon = makeIcon(
  <>
    <path d="M4 6v12M12 6v12M4 12h8" />
    <path d="M16 9.5c0-.83.9-1.5 2-1.5s2 .67 2 1.5-1 1.5-2 1.5c1 0 2 .67 2 1.5s-.9 1.5-2 1.5-2-.67-2-1.5" />
  </>
)

export const BulletListIcon = makeIcon(
  <>
    <circle cx="4" cy="6" r="1" />
    <circle cx="4" cy="12" r="1" />
    <circle cx="4" cy="18" r="1" />
    <line x1="9" y1="6" x2="20" y2="6" />
    <line x1="9" y1="12" x2="20" y2="12" />
    <line x1="9" y1="18" x2="20" y2="18" />
  </>
)

export const OrderedListIcon = makeIcon(
  <>
    <text x="1" y="8" fontSize="7" stroke="none" fill="currentColor">1</text>
    <text x="1" y="14" fontSize="7" stroke="none" fill="currentColor">2</text>
    <text x="1" y="20" fontSize="7" stroke="none" fill="currentColor">3</text>
    <line x1="9" y1="6" x2="20" y2="6" />
    <line x1="9" y1="12" x2="20" y2="12" />
    <line x1="9" y1="18" x2="20" y2="18" />
  </>
)

export const QuoteIcon = makeIcon(
  <>
    <path d="M7 7h4v4c0 3-2 5-4 5" />
    <path d="M15 7h4v4c0 3-2 5-4 5" />
  </>
)

export const AlignLeftIcon = makeIcon(
  <>
    <line x1="4" y1="6" x2="20" y2="6" />
    <line x1="4" y1="12" x2="14" y2="12" />
    <line x1="4" y1="18" x2="17" y2="18" />
  </>
)

export const AlignCenterIcon = makeIcon(
  <>
    <line x1="4" y1="6" x2="20" y2="6" />
    <line x1="7" y1="12" x2="17" y2="12" />
    <line x1="6" y1="18" x2="18" y2="18" />
  </>
)

export const AlignRightIcon = makeIcon(
  <>
    <line x1="4" y1="6" x2="20" y2="6" />
    <line x1="10" y1="12" x2="20" y2="12" />
    <line x1="7" y1="18" x2="20" y2="18" />
  </>
)

export const AlignJustifyIcon = makeIcon(
  <>
    <line x1="4" y1="6" x2="20" y2="6" />
    <line x1="4" y1="12" x2="20" y2="12" />
    <line x1="4" y1="18" x2="20" y2="18" />
  </>
)

export const LinkIcon = makeIcon(
  <>
    <path d="M10 14a4 4 0 0 0 5.66 0l2-2a4 4 0 0 0-5.66-5.66l-1 1" />
    <path d="M14 10a4 4 0 0 0-5.66 0l-2 2a4 4 0 0 0 5.66 5.66l1-1" />
  </>
)

export const ImageIcon = makeIcon(
  <>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <circle cx="9" cy="10" r="1.5" />
    <path d="M3 17l5-5 4 4 3-3 6 6" />
  </>
)

export const TableIcon = makeIcon(
  <>
    <rect x="3" y="4" width="18" height="16" rx="1" />
    <line x1="3" y1="10" x2="21" y2="10" />
    <line x1="3" y1="16" x2="21" y2="16" />
    <line x1="9" y1="4" x2="9" y2="20" />
    <line x1="15" y1="4" x2="15" y2="20" />
  </>
)

export const UndoIcon = makeIcon(
  <>
    <path d="M4 10h10a5 5 0 0 1 0 10H8" />
    <polyline points="9 5 4 10 9 15" />
  </>
)

export const RedoIcon = makeIcon(
  <>
    <path d="M20 10H10a5 5 0 0 0 0 10h6" />
    <polyline points="15 5 20 10 15 15" />
  </>
)

export const DownloadIcon = makeIcon(
  <>
    <path d="M12 3v12" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="4" y1="20" x2="20" y2="20" />
  </>
)

export const PrinterIcon = makeIcon(
  <>
    <polyline points="6 9 6 3 18 3 18 9" />
    <rect x="4" y="9" width="16" height="8" rx="1" />
    <rect x="7" y="14" width="10" height="6" />
  </>
)

export const SaveIcon = makeIcon(
  <>
    <path d="M5 4h11l3 3v13H5z" />
    <path d="M8 4v6h8V4" />
    <path d="M8 20v-6h8v6" />
  </>
)

export const VariableIcon = makeIcon(
  <>
    <path d="M7 4c-2 2-2 5 0 8s2 6 0 8" />
    <path d="M17 4c2 2 2 5 0 8s-2 6 0 8" />
  </>
)

export const TableRowPlusIcon = makeIcon(
  <>
    <rect x="3" y="4" width="18" height="10" rx="1" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="9" y1="19" x2="15" y2="19" />
    <line x1="12" y1="16" x2="12" y2="22" />
  </>
)

export const TableRowMinusIcon = makeIcon(
  <>
    <rect x="3" y="4" width="18" height="10" rx="1" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="9" y1="19" x2="15" y2="19" />
  </>
)

export const TableColumnPlusIcon = makeIcon(
  <>
    <rect x="4" y="3" width="10" height="18" rx="1" />
    <line x1="9" y1="3" x2="9" y2="21" />
    <line x1="19" y1="9" x2="19" y2="15" />
    <line x1="16" y1="12" x2="22" y2="12" />
  </>
)

export const TableColumnMinusIcon = makeIcon(
  <>
    <rect x="4" y="3" width="10" height="18" rx="1" />
    <line x1="9" y1="3" x2="9" y2="21" />
    <line x1="16" y1="12" x2="22" y2="12" />
  </>
)

export const CloseIcon = makeIcon(
  <>
    <line x1="6" y1="6" x2="18" y2="18" />
    <line x1="18" y1="6" x2="6" y2="18" />
  </>
)

export const ChevronDownIcon = makeIcon(<polyline points="6 9 12 15 18 9" />)

export const SubscriptIcon = makeIcon(
  <>
    <text x="2" y="16" fontSize="14" stroke="none" fill="currentColor">A</text>
    <text x="14" y="21" fontSize="8" stroke="none" fill="currentColor">2</text>
  </>
)

export const SuperscriptIcon = makeIcon(
  <>
    <text x="2" y="18" fontSize="14" stroke="none" fill="currentColor">A</text>
    <text x="14" y="9" fontSize="8" stroke="none" fill="currentColor">2</text>
  </>
)

export const EraserIcon = makeIcon(
  <>
    <path d="M18 13l-7 7H6l-3-3 10-10z" />
    <path d="M14 6l4 4" />
    <line x1="8" y1="20" x2="21" y2="20" />
  </>
)

export const MaximizeIcon = makeIcon(
  <>
    <polyline points="8 3 3 3 3 8" />
    <polyline points="16 3 21 3 21 8" />
    <polyline points="3 16 3 21 8 21" />
    <polyline points="16 21 21 21 21 16" />
  </>
)

export const MinimizeIcon = makeIcon(
  <>
    <polyline points="3 8 8 8 8 3" />
    <polyline points="21 8 16 8 16 3" />
    <polyline points="8 21 8 16 3 16" />
    <polyline points="16 16 16 21 21 21" />
  </>
)

export const SunIcon = makeIcon(
  <>
    <circle cx="12" cy="12" r="4" />
    <line x1="12" y1="2" x2="12" y2="4" />
    <line x1="12" y1="20" x2="12" y2="22" />
    <line x1="4.2" y1="4.2" x2="5.6" y2="5.6" />
    <line x1="18.4" y1="18.4" x2="19.8" y2="19.8" />
    <line x1="2" y1="12" x2="4" y2="12" />
    <line x1="20" y1="12" x2="22" y2="12" />
    <line x1="4.2" y1="19.8" x2="5.6" y2="18.4" />
    <line x1="18.4" y1="5.6" x2="19.8" y2="4.2" />
  </>
)

export const MoonIcon = makeIcon(<path d="M20 14.5a8 8 0 1 1-8.5-11.9 7 7 0 0 0 8.5 11.9z" />)

export const PanelRightIcon = makeIcon(
  <>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <line x1="15" y1="4" x2="15" y2="20" />
  </>
)

export const CheckSquareIcon = makeIcon(
  <>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <polyline points="7 12 10 15 17 8" />
  </>
)

export const PageBreakIcon = makeIcon(
  <>
    <rect x="4" y="2" width="16" height="8" rx="1" />
    <rect x="4" y="14" width="16" height="8" rx="1" />
    <line x1="2" y1="12" x2="6" y2="12" />
    <line x1="9" y1="12" x2="12" y2="12" />
    <line x1="15" y1="12" x2="18" y2="12" />
    <line x1="21" y1="12" x2="22" y2="12" />
  </>
)

export const ZoomInIcon = makeIcon(
  <>
    <circle cx="10" cy="10" r="7" />
    <line x1="16" y1="16" x2="21" y2="21" />
    <line x1="7" y1="10" x2="13" y2="10" />
    <line x1="10" y1="7" x2="10" y2="13" />
  </>
)

export const ZoomOutIcon = makeIcon(
  <>
    <circle cx="10" cy="10" r="7" />
    <line x1="16" y1="16" x2="21" y2="21" />
    <line x1="7" y1="10" x2="13" y2="10" />
  </>
)

export const PaletteIcon = makeIcon(
  <>
    <path d="M12 3a9 9 0 1 0 0 18c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.3-.5-.8-.5-1.3 0-1.1.9-2 2-2h1.5c2 0 3.5-1.5 3.5-3.5C20 6.5 16.5 3 12 3z" />
    <circle cx="7.5" cy="10.5" r="1" fill="currentColor" stroke="none" />
    <circle cx="11" cy="7.5" r="1" fill="currentColor" stroke="none" />
    <circle cx="15.5" cy="8.5" r="1" fill="currentColor" stroke="none" />
  </>
)

export const MoreHorizontalIcon = makeIcon(
  <>
    <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" />
  </>
)

export const SearchIcon = makeIcon(
  <>
    <circle cx="10" cy="10" r="6" />
    <line x1="15" y1="15" x2="20" y2="20" />
  </>
)

export const MessageIcon = makeIcon(
  <path d="M4 4h16v12H8l-4 4V4z" />
)

export const ListTreeIcon = makeIcon(
  <>
    <line x1="4" y1="5" x2="14" y2="5" />
    <line x1="8" y1="12" x2="18" y2="12" />
    <line x1="8" y1="19" x2="18" y2="19" />
    <circle cx="4" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="4" cy="19" r="1" fill="currentColor" stroke="none" />
  </>
)

export const HistoryIcon = makeIcon(
  <>
    <path d="M3 12a9 9 0 1 0 3-6.7" />
    <polyline points="3 4 3 9 8 9" />
    <polyline points="12 8 12 12 15 14" />
  </>
)

export const LockIcon = makeIcon(
  <>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </>
)

export const UnlockIcon = makeIcon(
  <>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 7.5-2" />
  </>
)

export const KeyboardIcon = makeIcon(
  <>
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <line x1="6" y1="10" x2="6" y2="10" />
    <line x1="10" y1="10" x2="10" y2="10" />
    <line x1="14" y1="10" x2="14" y2="10" />
    <line x1="18" y1="10" x2="18" y2="10" />
    <line x1="7" y1="14" x2="17" y2="14" />
  </>
)

export const LineHeightIcon = makeIcon(
  <>
    <polyline points="7 4 4 7 7 10" />
    <line x1="4" y1="7" x2="4" y2="17" />
    <polyline points="7 14 4 17 7 20" />
    <line x1="10" y1="6" x2="20" y2="6" />
    <line x1="10" y1="12" x2="20" y2="12" />
    <line x1="10" y1="18" x2="20" y2="18" />
  </>
)

export const UsersIcon = makeIcon(
  <>
    <circle cx="9" cy="8" r="3" />
    <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
    <circle cx="17" cy="9" r="2.5" />
    <path d="M15.5 14.2c2.5.4 4.5 2.6 4.5 5.8" />
  </>
)

export const FileTextIcon = makeIcon(
  <>
    <path d="M6 2h9l5 5v15H6z" />
    <polyline points="15 2 15 7 20 7" />
    <line x1="9" y1="13" x2="16" y2="13" />
    <line x1="9" y1="17" x2="16" y2="17" />
  </>
)
