import type { SVGProps } from "react";

type IconName =
  | "share"
  | "dots"
  | "comments"
  | "board"
  | "switch"
  | "plus"
  | "close"
  | "grip"
  | "friends"
  | "bell"
  | "search";

type IconProps = SVGProps<SVGSVGElement> & {
  name: IconName;
};

export function Icon({ name, className, ...props }: IconProps) {
  const baseProps = {
    className: className ?? "board-icon",
    viewBox: "0 0 24 24",
    ...props,
  };

  switch (name) {
    case "share":
      return (
        <svg {...baseProps} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="8.5" cy="7" r="4" />
          <line x1="20" x2="20" y1="8" y2="14" />
          <line x1="23" x2="17" y1="11" y2="11" />
        </svg>
      );
    case "dots":
      return (
        <svg {...baseProps} fill="currentColor">
          <circle cx="5" cy="12" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="19" cy="12" r="1.8" />
        </svg>
      );
    case "comments":
      return (
        <svg {...baseProps} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      );
    case "board":
      return (
        <svg {...baseProps} fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <line x1="9" x2="9" y1="5" y2="19" />
        </svg>
      );
    case "switch":
      return (
        <svg {...baseProps} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 7h13" />
          <path d="M3 12h18" />
          <path d="M3 17h10" />
        </svg>
      );
    case "plus":
      return (
        <svg {...baseProps} fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" x2="12" y1="5" y2="19" />
          <line x1="5" x2="19" y1="12" y2="12" />
        </svg>
      );
    case "close":
      return (
        <svg {...baseProps} fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" x2="6" y1="6" y2="18" />
          <line x1="6" x2="18" y1="6" y2="18" />
        </svg>
      );
    case "grip":
      return (
        <svg {...baseProps} fill="currentColor">
          <circle cx="6.5" cy="12" r="1.7" />
          <circle cx="12" cy="12" r="1.7" />
          <circle cx="17.5" cy="12" r="1.7" />
        </svg>
      );
    case "friends":
      return (
        <svg {...baseProps} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="8.5" cy="7" r="4" />
          <line x1="20" x2="20" y1="8" y2="14" />
          <line x1="23" x2="17" y1="11" y2="11" />
        </svg>
      );
    case "bell":
      return (
        <svg {...baseProps} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      );
    case "search":
      return (
        <svg {...baseProps} fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <line x1="20" x2="16.65" y1="20" y2="16.65" />
        </svg>
      );
    default:
      return null;
  }
}
