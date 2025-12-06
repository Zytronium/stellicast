'use client'

import Link from 'next/link'
import { Bars3Icon as MenuIcon, XMarkIcon as XIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'
import Image from 'next/image'

export default function Header() {
  const [open, setOpen] = useState(false)

  return (
    <header className="bg-gray-900 text-white">
      <nav className="max-w-7xl mx-auto flex items-center justify-between p-4">
        <Link href="/" className="text-xl font-bold flex row gap-2 items-center">
          <Image src="/logo.png" alt="Stellicast Logo" width={32} height={32} />
          Stellicast
        </Link>

        {/* Desktop links */}
        <ul className="hidden md:flex space-x-6">
          <li><Link href="/explore">Explore</Link></li>
          <li><Link href="/upload">Upload</Link></li>
          <li><Link href="/settings">Settings</Link></li>
        </ul>

        {/* Mobile menu button */}
        <button
          className="md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <XIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
        </button>
      </nav>

      {/* Mobile drawer */}
      {open && (
        <ul className="md:hidden bg-gray-800 space-y-2 py-2">
          <li className="px-4"><Link href="/explore">Explore</Link></li>
          <li className="px-4"><Link href="/upload">Upload</Link></li>
          <li className="px-4"><Link href="/settings">Settings</Link></li>
        </ul>
      )}
    </header>
  )
}