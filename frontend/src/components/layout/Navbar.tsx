import React from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { ShoppingCart, Menu, Sun, Moon, Monitor, User, Package, LogOut, Search } from 'lucide-react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useAuthStore } from '@/store/auth.store'
import { useCartStore } from '@/store/cart.store'
import { useThemeStore } from '@/store/theme.store'
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

const NAV_LINKS = [
  { to: '/products', label: 'Products' },
  { to: '/categories', label: 'Categories' },
  { to: '/about', label: 'About' },
]

interface NavbarProps {
  onSearchOpen?: () => void
}

export const Navbar: React.FC<NavbarProps> = ({ onSearchOpen }) => {
  const { user, isAuthenticated, clearUser } = useAuthStore()
  const { cart, openCart } = useCartStore()
  const { theme, setTheme } = useThemeStore()
  const navigate = useNavigate()
  const location = useLocation()

  const { scrollY } = useScroll()
  const borderOpacity = useTransform(scrollY, [0, 60], [0, 1])
  const shadowOpacity = useTransform(scrollY, [0, 60], [0, 0.08])

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark')
    else if (theme === 'dark') setTheme('system')
    else setTheme('light')
  }

  const handleLogout = () => {
    clearUser()
    navigate('/login')
  }

  const itemCount = cart?.item_count ?? 0
  const userInitials = user
    ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase()
    : ''

  return (
    <motion.nav
      className="sticky top-0 z-40 bg-background/95 transition-colors duration-200"
      style={{
        boxShadow: shadowOpacity.get() > 0
          ? `0 1px 12px rgba(0,0,0,${shadowOpacity.get()})`
          : undefined,
      }}
    >
      <motion.div
        className="absolute inset-x-0 bottom-0 h-px bg-border"
        style={{ opacity: borderOpacity }}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-white text-sm font-bold leading-none">E</span>
            </div>
            <span className="text-xl font-bold text-foreground tracking-tight font-display">
              Elites
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const active = location.pathname === link.to
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'text-primary bg-primary/8'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}
          </div>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-1">
            {/* Search */}
            <button
              onClick={onSearchOpen}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Search (⌘K)"
            >
              <Search className="h-5 w-5" />
            </button>

            {/* Theme toggle */}
            <button
              onClick={cycleTheme}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title={`Theme: ${theme}`}
            >
              {theme === 'light' ? (
                <Sun className="h-5 w-5" />
              ) : theme === 'dark' ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Monitor className="h-5 w-5" />
              )}
            </button>

            {/* Cart */}
            <button
              onClick={openCart}
              className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label={`Cart (${itemCount} items)`}
            >
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 && (
                <motion.span
                  key={itemCount}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="absolute -top-0.5 -right-0.5 bg-primary text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center leading-none"
                >
                  {itemCount > 9 ? '9+' : itemCount}
                </motion.span>
              )}
            </button>

            {/* Auth */}
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="ml-1 flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted transition-colors">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="bg-primary text-white text-xs font-semibold">
                        {userInitials || <User className="h-3 w-3" />}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium">{user?.first_name} {user?.last_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/account" className="flex items-center gap-2 cursor-pointer">
                      <User className="h-4 w-4" />
                      Account
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/orders" className="flex items-center gap-2 cursor-pointer">
                      <Package className="h-4 w-4" />
                      My Orders
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="flex items-center gap-2 text-destructive cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2 ml-1">
                <Link to="/login">
                  <Button variant="ghost" size="sm">Login</Button>
                </Link>
                <Link to="/register">
                  <Button size="sm">Register</Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile actions */}
          <div className="md:hidden flex items-center gap-1">
            <button
              onClick={openCart}
              className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
            >
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 && (
                <motion.span
                  key={itemCount}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="absolute -top-0.5 -right-0.5 bg-primary text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center"
                >
                  {itemCount > 9 ? '9+' : itemCount}
                </motion.span>
              )}
            </button>

            <Sheet>
              <SheetTrigger asChild>
                <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors">
                  <Menu className="h-5 w-5" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <div className="flex flex-col h-full">
                  {/* Mobile sheet header */}
                  <div className="flex items-center gap-2 px-6 py-5 border-b">
                    <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                      <span className="text-white text-sm font-bold">E</span>
                    </div>
                    <span className="text-xl font-bold font-display">Elites</span>
                  </div>

                  {/* Nav links */}
                  <nav className="flex-1 px-4 py-6 space-y-1">
                    {NAV_LINKS.map((link) => (
                      <SheetClose asChild key={link.to}>
                        <Link
                          to={link.to}
                          className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                            location.pathname === link.to
                              ? 'text-primary bg-primary/8'
                              : 'text-foreground hover:bg-muted'
                          }`}
                        >
                          {link.label}
                        </Link>
                      </SheetClose>
                    ))}
                  </nav>

                  <Separator />

                  {/* Mobile auth + theme */}
                  <div className="px-4 py-6 space-y-2">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-muted-foreground">Appearance</span>
                      <button
                        onClick={cycleTheme}
                        className="p-2 rounded-lg hover:bg-muted transition-colors"
                      >
                        {theme === 'light' ? (
                          <Sun className="h-4 w-4" />
                        ) : theme === 'dark' ? (
                          <Moon className="h-4 w-4" />
                        ) : (
                          <Monitor className="h-4 w-4" />
                        )}
                      </button>
                    </div>

                    {isAuthenticated ? (
                      <>
                        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary text-white text-xs font-semibold">
                              {userInitials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{user?.first_name} {user?.last_name}</p>
                            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                          </div>
                        </div>
                        <SheetClose asChild>
                          <Link to="/orders">
                            <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                              <Package className="h-4 w-4" /> My Orders
                            </Button>
                          </Link>
                        </SheetClose>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start gap-2 text-destructive hover:text-destructive"
                          onClick={handleLogout}
                        >
                          <LogOut className="h-4 w-4" /> Logout
                        </Button>
                      </>
                    ) : (
                      <>
                        <SheetClose asChild>
                          <Link to="/login">
                            <Button variant="outline" size="sm" className="w-full">Login</Button>
                          </Link>
                        </SheetClose>
                        <SheetClose asChild>
                          <Link to="/register">
                            <Button size="sm" className="w-full">Register</Button>
                          </Link>
                        </SheetClose>
                      </>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </motion.nav>
  )
}
