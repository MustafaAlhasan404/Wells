"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { MountainIcon, MenuIcon, XIcon, BarChart2 } from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function NavBar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const pathname = usePathname()

  // Close mobile menu when pathname changes
  useEffect(() => {
    setIsMenuOpen(false)
  }, [pathname])

  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      <div className="container flex h-16 items-center px-4 sm:px-8">
        <div className="flex items-center">
          <Link href="/" className="flex items-center space-x-2">
            <MountainIcon className="h-6 w-6 text-primary" />
            <span className="hidden font-bold sm:inline-block">Wells Analyzer</span>
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-end space-x-4">
          <div className="hidden md:flex items-center space-x-4">
            <nav className="flex items-center space-x-4">
              <Link 
                href="/" 
                className={cn("text-sm font-medium transition-colors hover:text-primary", 
                  pathname === "/" ? "text-primary" : "text-muted-foreground"
                )}
              >
                Home
              </Link>
              <Link 
                href="/data-input" 
                className={cn("text-sm font-medium transition-colors hover:text-primary", 
                  pathname === "/data-input" ? "text-primary" : "text-muted-foreground"
                )}
              >
                Data Input
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
                href="/equations" 
                className={cn("text-sm font-medium transition-colors hover:text-primary", 
                  pathname === "/equations" ? "text-primary" : "text-muted-foreground"
                )}
              >
                Equations
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
            <Link 
              href="/" 
              className={cn("text-sm font-medium transition-colors hover:text-primary", 
                pathname === "/" ? "text-primary" : "text-muted-foreground"
              )}
            >
              Home
            </Link>
            <Link 
              href="/data-input" 
              className={cn("text-sm font-medium transition-colors hover:text-primary", 
                pathname === "/data-input" ? "text-primary" : "text-muted-foreground"
              )}
            >
              Data Input
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
              href="/equations" 
              className={cn("text-sm font-medium transition-colors hover:text-primary", 
                pathname === "/equations" ? "text-primary" : "text-muted-foreground"
              )}
            >
              Equations
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