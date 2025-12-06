import './globals.css'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

export const metadata = {
  title: 'Stellicast – The YouTube Alternative We\'re Still Waiting For',
  description: 'Privacy‑first video platform with transparent AI policies.',
  icons: '/favicon.ico',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="scroll-smooth">
    <body className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
    <Header />
    <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
      {children}
    </main>
    <Footer />
    </body>
    </html>
  )
}