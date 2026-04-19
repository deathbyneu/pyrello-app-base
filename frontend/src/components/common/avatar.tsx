import type { UserSummary } from "@/lib/types";

type AvatarProps = {
  user: UserSummary;
  className?: string;
  title?: string;
};

export function Avatar({
  user,
  className = "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-white/90 text-[11px] font-extrabold text-white",
  title,
}: AvatarProps) {
  return (
    <span
      className={className}
      style={{ background: user.avatar_color }}
      title={title ?? user.username}
    >
      {user.avatar_initial}
    </span>
  );
}
