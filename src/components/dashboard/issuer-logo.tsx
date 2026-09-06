"use client";

import { useState } from "react";

export function IssuerLogo({
  src,
  name,
  color,
}: {
  src: string;
  name: string;
  color: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div
        className="flex size-8 shrink-0 items-center justify-center rounded-md text-xs font-semibold text-white"
        style={{ background: color }}
        aria-hidden
      >
        {name.slice(0, 1)}
      </div>
    );
  }
  return (
    // External DefiLlama icons; fallback to initial on error.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={32}
      height={32}
      className="size-8 shrink-0 rounded-md bg-white/5 object-contain"
      onError={() => setFailed(true)}
    />
  );
}
