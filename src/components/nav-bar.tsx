"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { MountainIcon, MenuIcon, XIcon, Settings } from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useWellType } from "@/context/WellTypeContext"

export function NavBar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const pathname = usePathname()
  const { wellType } = useWellType()

  // Close mobile menu when pathname changes
  useEffect(() => {
    setIsMenuOpen(false)
  }, [pathname])

  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      <div className="container flex h-16 items-center px-4 sm:px-8">
        <div className="flex items-center">
          <Link href="/casing-calculator" className="flex items-center space-x-2">
            <MountainIcon className="h-6 w-6 text-primary" />
            <span className="hidden font-bold sm:inline-block">Deep Drill</span>
          </Link>
          <div className="ml-4 hidden sm:flex">
            <span className="px-3 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary">
              {wellType === 'exploration' ? 'Exploration Well' : 'Production Well'}
            </span>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-end space-x-4">
          <div className="hidden md:flex items-center space-x-4">
            <Link href="/mode" className="flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              <Settings className="mr-1 h-4 w-4" />
              Change Mode
            </Link>
            <nav className="flex items-center space-x-4">
              <Link 
                href="/casing-calculator" 
                className={cn("text-sm font-medium transition-colors hover:text-primary", 
                  pathname === "/casing-calculator" ? "text-primary" : "text-muted-foreground"
                )}
              >
                Casing Calculator
              </Link>
              <Link 
                href="/formation-design" 
                className={cn("text-sm font-medium transition-colors hover:text-primary", 
                  pathname === "/formation-design" ? "text-primary" : "text-muted-foreground"
                )}
              >
                Formation Design
              </Link>
              <Link 
                href="/semantics" 
                className={cn("text-sm font-medium transition-colors hover:text-primary", 
                  pathname === "/semantics" ? "text-primary" : "text-muted-foreground"
                )}
              >
                Semantics
              </Link>
            </nav>

            <ModeToggle />
          </div>

          <Button
            variant="ghost"
            className="h-9 w-9 p-0 md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <span className="sr-only">Toggle menu</span>
            {isMenuOpen ? (
              <XIcon className="h-5 w-5" />
            ) : (
              <MenuIcon className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="container md:hidden">
          <nav className="flex flex-col space-y-4 p-4">
            <div className="flex items-center mb-2">
              <span className="px-3 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary">
                {wellType === 'exploration' ? 'Exploration Well' : 'Production Well'}
              </span>
            </div>
            <Link 
              href="/mode"
              className="flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              <Settings className="mr-2 h-4 w-4" />
              Change Mode
            </Link>
            <Link 
              href="/casing-calculator" 
              className={cn("text-sm font-medium transition-colors hover:text-primary", 
                pathname === "/casing-calculator" ? "text-primary" : "text-muted-foreground"
              )}
            >
              Casing Calculator
            </Link>
            <Link 
              href="/formation-design" 
              className={cn("text-sm font-medium transition-colors hover:text-primary", 
                pathname === "/formation-design" ? "text-primary" : "text-muted-foreground"
              )}
            >
              Formation Design
            </Link>
            <Link 
              href="/semantics" 
              className={cn("text-sm font-medium transition-colors hover:text-primary", 
                pathname === "/semantics" ? "text-primary" : "text-muted-foreground"
              )}
            >
              Semantics
            </Link>
            <div className="pt-2">
              <ModeToggle />
            </div>
          </nav>
        </div>
      )}
    </header>
  )
} 