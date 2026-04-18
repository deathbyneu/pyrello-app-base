type LoadingCardProps = {
  title: string;
  message: string;
};

export function LoadingCard({ title, message }: LoadingCardProps) {
  return (
    <div className="board-loading">
      <section className="board-loading__card">
        <span className="board-loading__pulse" />
        <p className="board-loading__title">{title}</p>
        <p className="board-loading__text">{message}</p>
      </section>
    </div>
  );
}
