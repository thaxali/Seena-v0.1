import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProfileProvider } from "@/contexts/ProfileContext";
import { Toaster } from 'sonner';

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "SeenaZero",
  description: "Research study management platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased text-black bg-gray-50`}>
        <AuthProvider>
          <ProfileProvider>
            {children}
          </ProfileProvider>
        </AuthProvider>
        <Toaster 
          position="top-right"
          theme="light"
          richColors
          toastOptions={{
            style: {
              padding: '1rem',
              borderRadius: '0.85rem',
              backdropFilter: 'blur(10px)',
              fontSize: '0.65rem',
              lineHeight: '1.25rem',
              fontFamily: 'monospace',
              backgroundColor: 'rgba(240, 240, 240, 0.8)',
              border: '0.5px solid rgba(255, 255, 255, 0.4)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
            }
          }}
        />
      </body>
    </html>
  );
}
