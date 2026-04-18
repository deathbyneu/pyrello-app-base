"use client";

import { useEffect, useRef, type ComponentPropsWithoutRef } from "react";

type ExclusiveDetailsProps = ComponentPropsWithoutRef<"details"> & {
  group?: string;
};

export function ExclusiveDetails({
  children,
  group = "popup",
  ...props
}: ExclusiveDetailsProps) {
  const detailsRef = useRef<HTMLDetailsElement | null>(null);

  useEffect(() => {
    const details = detailsRef.current;
    if (!details) return;

    const handleToggle = () => {
      if (!details.open) return;

      const openDetails = document.querySelectorAll<HTMLDetailsElement>(
        "details[data-exclusive-group][open]",
      );

      for (const candidate of openDetails) {
        if (
          candidate !== details &&
          candidate.dataset.exclusiveGroup === group
        ) {
          candidate.open = false;
        }
      }
    };

    details.addEventListener("toggle", handleToggle);
    return () => details.removeEventListener("toggle", handleToggle);
  }, [group]);

  return (
    <details data-exclusive-group={group} ref={detailsRef} {...props}>
      {children}
    </details>
  );
}
