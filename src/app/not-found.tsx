import Link from "next/link";

export default function NotFound() {
  return (
    <section className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <p className="text-sm font-medium text-muted-foreground">404</p>
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="text-muted-foreground">
        The page you are looking for does not exist.
      </p>
      <Link
        href="/"
        className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
      >
        Go home
      </Link>
    </section>
  );
}
