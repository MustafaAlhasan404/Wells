import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";
import { FileUploadProvider } from "@/context/FileUploadContext";
import { WellTypeProvider } from "@/context/WellTypeContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Deep Drill - Well Formation Analysis",
  description: "Advanced analytics for well engineering and drill collar design",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-background text-foreground antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <WellTypeProvider>
            <FileUploadProvider>
              <main className="min-h-screen flex flex-col">
                {children}
              </main>
              <Toaster position="top-right" closeButton richColors />
            </FileUploadProvider>
          </WellTypeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
