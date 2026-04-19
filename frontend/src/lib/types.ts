export type UserSummary = {
  id: number;
  username: string;
  avatar_color: string;
  avatar_initial: string;
};

export type BoardSummary = {
  id: number;
  title: string;
  description: string;
  owner_id: number;
  owner_username: string;
  allow_public_join: boolean;
  background_image_url: string | null;
  background_image_name: string | null;
  uses_default_background: boolean;
  created_at: string | null;
};

export type Membership = {
  role: string;
  joined_at: string | null;
  board: BoardSummary;
};

export type FriendRequest = {
  id: number;
  status: string;
  created_at: string | null;
  responded_at: string | null;
  sender: UserSummary;
  receiver: UserSummary;
};

export type BoardInvite = {
  id: number;
  status: string;
  created_at: string | null;
  responded_at: string | null;
  board: BoardSummary;
  inviter: UserSummary;
  invitee: UserSummary;
};

export type Notification = {
  id: number;
  category: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string | null;
};

export type BoardActivity = {
  id: number;
  event_type: string;
  message: string;
  created_at: string | null;
  actor: UserSummary | null;
  task_id: number | null;
  task_title: string | null;
  list_id: number | null;
  list_title: string | null;
};

export type BoardPermissions = {
  can_manage_board: boolean;
  can_manage_members: boolean;
  can_edit_content: boolean;
  can_comment: boolean;
  can_upload_attachments: boolean;
  can_assign_tasks: boolean;
};

export type TaskAttachment = {
  id: number;
  original_name: string;
  content_type: string;
  size_bytes: number;
  created_at: string | null;
  url: string;
  uploader: UserSummary;
};

export type TaskComment = {
  id: number;
  content: string;
  created_at: string | null;
  user: UserSummary;
};

export type Task = {
  id: number;
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  due_date: string | null;
  list_id: number;
  list_title: string | null;
  board_id: number;
  is_completed: boolean;
  position: number;
  created_at: string | null;
  updated_at: string | null;
  creator: UserSummary;
  assignee: UserSummary | null;
  comments_count: number;
  attachments: TaskAttachment[];
  cover_image: TaskAttachment | null;
  comments?: TaskComment[];
};

export type BoardMember = {
  role: string;
  joined_at: string | null;
  user: UserSummary;
};

export type ShareCandidate = {
  user: UserSummary;
  already_member: boolean;
  invite_pending: boolean;
};

export type BoardList = {
  id: number;
  title: string;
  position: number;
  tasks: Task[];
};

export type BoardDetail = {
  board: BoardSummary;
  member_role: string;
  ai_task_generation_enabled: boolean;
  permissions: BoardPermissions;
  can_manage_board: boolean;
  members: BoardMember[];
  pending_invites: BoardInvite[];
  share_candidates: ShareCandidate[];
  memberships: Membership[];
  activities: BoardActivity[];
  lists: BoardList[];
  selected_task: Task | null;
};

export type AiTaskDraft = {
  id: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  due_date: string | null;
  target_list_id: number;
  target_list_title: string;
  reason: string;
};

export type AiTaskDraftResponse = {
  summary: string;
  drafts: AiTaskDraft[];
};

export type AiTaskDraftConfirmResponse = {
  created_count: number;
  created_tasks: Task[];
};

export type DashboardData = {
  workspace_query: string;
  memberships: Membership[];
  open_boards: BoardSummary[];
  incoming_friend_requests: FriendRequest[];
  outgoing_friend_requests: FriendRequest[];
  friends: UserSummary[];
  pending_board_invites: BoardInvite[];
};

export type MeSummary = {
  user: UserSummary;
  unread_notification_count: number;
  recent_notifications: Notification[];
  friend_requests: FriendRequest[];
  board_invites: BoardInvite[];
};
