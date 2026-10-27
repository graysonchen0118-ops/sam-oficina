import type { Metadata, Viewport } from "next";
import { Lexend } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import Shell from "@/components/Shell";

const lexend = Lexend({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });

export const metadata: Metadata = {
  title: { default: "Sam Delano | Asistente del estudio", template: "%s | Sam Delano" },
  description: "Una sola conversación para todo el trabajo de oficina del estudio: Sam elige qué IA lo hace y nada se mueve sin su permiso.",
};

export const viewport: Viewport = {
  themeColor: "#1f5f9e",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={lexend.className}>
        <StoreProvider>
          <Shell>{children}</Shell>
        </StoreProvider>
      </body>
    </html>
  );
}
