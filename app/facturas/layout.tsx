import type { Metadata } from "next";

export const metadata: Metadata = { title: "Facturas de inmuebles" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
