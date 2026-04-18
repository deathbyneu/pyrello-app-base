import Link from "next/link";

type BrandLinkProps = {
  href: string;
  className: string;
  imageClassName: string;
};

export function BrandLink({
  href,
  className,
  imageClassName,
}: BrandLinkProps) {
  return (
    <Link href={href} className={className}>
      <img alt="Pyrello" className={imageClassName} src="/icons/pyrello.png" />
    </Link>
  );
}
