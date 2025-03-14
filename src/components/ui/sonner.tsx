"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          success: "group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border",
          error: "group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border",
          info: "group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border",
          warning: "group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border",
          closeButton: "absolute right-2 top-2 opacity-70 transition-opacity hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-0",
        },
        duration: 4000,
      }}
      closeButton
      position="top-right"
      expand={false}
      visibleToasts={5}
      offset={16}
      dir="ltr"
      hotkey={["altKey", "KeyT"]}
      richColors={false}
      style={
        {
          "--normal-bg": "var(--background)",
          "--normal-text": "var(--foreground)",
          "--normal-border": "var(--border)",
          "--toast-transition-duration": "0ms",
          "--toast-transition-timing-function": "ease",
          "--shadow": "var(--shadow)",
          "--z-index": "9999",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
