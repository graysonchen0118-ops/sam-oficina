import type { Metadata } from "next";

export const metadata: Metadata = { title: "Ruta de IA" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
