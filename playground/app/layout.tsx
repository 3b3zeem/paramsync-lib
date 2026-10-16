import React from 'react';

export const metadata = {
  title: 'paramsync Interactive Playground',
  description: 'Test paramsync URL search params synchronization in real time',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: 0,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
          backgroundColor: '#f8fafc',
          color: '#0f172a',
          minHeight: '100vh',
        }}
      >
        {children}
      </body>
    </html>
  );
}
