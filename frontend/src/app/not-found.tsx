import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-[#DEE4EA]">404</h1>
      <p className="mt-2 text-[#9FADBC]">Page not found.</p>
      <Link
        className="mt-4 inline-block text-[#85B8FF] hover:text-[#cce0ff]"
        href="/"
      >
        Back home
      </Link>
    </main>
  );
}
