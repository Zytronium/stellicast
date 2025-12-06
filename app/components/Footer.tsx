export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-4 mt-12">
      <div className="max-w-7xl mx-auto text-center text-sm">
        © {new Date().getFullYear()} Stellicast • All rights reserved
      </div>
    </footer>
  )
}