import type { UserSummary } from "@/lib/types";

type AvatarProps = {
  user: UserSummary;
  className?: string;
  title?: string;
};

export function Avatar({
  user,
  className = "board-avatar",
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
