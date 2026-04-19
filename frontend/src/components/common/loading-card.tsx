type LoadingCardProps = {
  title: string;
  message: string;
};

export function LoadingCard({ title, message }: LoadingCardProps) {
  return (
    <div className="grid min-h-[calc(100vh-3.5rem)] place-items-center p-8">
      <section className="w-full max-w-md rounded-[28px] border border-white/10 bg-[rgba(13,19,30,0.72)] p-6 shadow-[0_22px_80px_rgba(0,0,0,0.26)] backdrop-blur-[18px]">
        <span className="block h-3.5 w-20 animate-pulse rounded-full bg-[linear-gradient(90deg,rgba(126,181,255,0.2),rgba(126,181,255,0.88),rgba(126,181,255,0.2))]" />
        <p className="mt-4 text-[1.3rem] font-extrabold text-slate-50">{title}</p>
        <p className="mt-2 text-slate-400">{message}</p>
      </section>
    </div>
  );
}
