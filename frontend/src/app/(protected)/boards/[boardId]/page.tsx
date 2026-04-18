import { BoardPage } from "@/components/board/board-page";

export default async function BoardRoute({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  const { boardId } = await params;
  return <BoardPage boardId={Number(boardId)} />;
}
