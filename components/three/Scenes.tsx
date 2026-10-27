"use client";

import dynamic from "next/dynamic";

export const Fondo = dynamic(() => import("./Fondo"), {
  ssr: false,
  loading: () => <div className="bg-fallback" aria-hidden="true" />,
});

export const Casco = dynamic(() => import("./Casco"), {
  ssr: false,
  loading: () => <div className="hero-ph" aria-hidden="true" />,
});

export const Canal = dynamic(() => import("./Canal"), {
  ssr: false,
  loading: () => <div className="canal-ph" aria-hidden="true" />,
});
