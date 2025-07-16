'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  BarChart3, 
  Users, 
  UserCheck, 
  Package, 
  Image, 
  Ticket, 
  Calendar, 
  TestTube,
  Camera,
  Stethoscope,
  LogOut,
  Menu,
  X,
  FlaskConical
} from 'lucide-react'
import { signOut } from '@/lib/auth'

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: BarChart3 },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Phlebotomists', href: '/admin/phlebotomists', icon: UserCheck },
  {
    name: 'Xray-Sonography',
    href: '/admin/services',
    icon: TestTube,
    children: [
      { name: 'Add X-Ray', href: '/admin/xraylist' },
      { name: 'Add Sonography', href: '/admin/sonographylist' },
    ],
  },
  {
    name: 'Services',
    href: '/admin/services',
    icon: TestTube,
    children: [
      { name: 'Add X-Ray', href: '/admin/xray' },
      { name: 'Add Sonography', href: '/admin/sonography' },
      { name: 'Add Package', href: '/admin/packages' },
      { name: 'Add Service', href: '/admin/services' },
      { name: 'Add Banner', href: '/admin/banners' },
      { name: 'Add Coupon', href: '/admin/coupons' },
      // { name: 'Add Test', href: '/admin/tests' },
    ],
  },
  { name: 'Bookings', href: '/admin/bookings', icon: Calendar },
  { name: 'ADD Report', href: '/admin/addreport', icon: Calendar },
]

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const [openMenus, setOpenMenus] = useState<string[]>([])

  const handleSignOut = async () => {
    await signOut()
    window.location.href = '/login'
  }

  const toggleMenu = (name: string) => {
    setOpenMenus((prev) =>
      prev.includes(name)
        ? prev.filter((n) => n !== name)
        : [...prev, name]
    )
  }

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="outline"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </Button>

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center h-16 px-6 border-b">
            <h1 className="text-xl font-bold text-blue-600">MedBliss Admin</h1>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 py-6">
            <nav className="px-3 space-y-2">
              {navigation.map((item) => {
                const Icon = item.icon
                const hasChildren = !!item.children
                const isMenuOpen = openMenus.includes(item.name)
                return (
                  <div key={item.name}>
                    {hasChildren ? (
                      <button
                        type="button"
                        className={cn(
                          "flex items-center w-full px-3 py-2 text-sm font-medium rounded-md transition-colors",
                          isMenuOpen
                            ? "bg-blue-100 text-blue-900"
                            : "text-gray-700 hover:bg-gray-100"
                        )}
                        onClick={() => toggleMenu(item.name)}
                      >
                        <Icon className="w-5 h-5 mr-3" />
                        {item.name}
                        <span className="ml-auto">{isMenuOpen ? '▾' : '▸'}</span>
                      </button>
                    ) : (
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                          pathname === item.href
                            ? "bg-blue-100 text-blue-900"
                            : "text-gray-700 hover:bg-gray-100"
                        )}
                        onClick={() => setIsOpen(false)}
                      >
                        <Icon className="w-5 h-5 mr-3" />
                        {item.name}
                      </Link>
                    )}
                    {hasChildren && isMenuOpen && (
                      <div className="ml-8 mt-1 space-y-1">
                        {item.children.map((child) => (
                          <Link
                            key={child.name}
                            href={child.href}
                            className={cn(
                              "flex items-center px-3 py-2 text-sm rounded-md transition-colors",
                              pathname === child.href
                                ? "bg-blue-50 text-blue-900"
                                : "text-gray-600 hover:bg-gray-100"
                            )}
                            onClick={() => {
                              setIsOpen(false);
                              setOpenMenus([]);
                            }}
                          >
                            + {child.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </nav>
          </ScrollArea>

          {/* Sign out button */}
          <div className="p-3 border-t">
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={handleSignOut}
            >
              <LogOut className="w-5 h-5 mr-3" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}