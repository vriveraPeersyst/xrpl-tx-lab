"use client";
import Link from "next/link";
import type { ComponentProps } from "react";
import { useHref } from "@/lib/net-context";

/** next/link that prefixes internal hrefs with the current network segment (/testnet, /devnet…). */
export default function NLink({ href, ...rest }: Omit<ComponentProps<typeof Link>, "href"> & { href: string }) {
  const h = useHref();
  return <Link href={h(href)} {...rest} />;
}
