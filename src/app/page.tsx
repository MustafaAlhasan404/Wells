"use client"

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MountainIcon } from "lucide-react";
import { motion } from "framer-motion";

export default function SplashScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set a timer to redirect to the data-input page
    const timer = setTimeout(() => {
      setLoading(false);
      setTimeout(() => {
        router.push("/data-input");
      }, 500); // Small delay after animation completes
    }, 1800); // Reduced animation time for faster experience

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="relative h-screen overflow-hidden flex items-center justify-center bg-background">
      {/* Animated grid background */}
      <div className="absolute inset-0 bg-grid-pattern" style={{
        backgroundSize: '50px 50px',
        backgroundImage: `
          linear-gradient(to right, var(--primary)/10% 1px, transparent 1px),
          linear-gradient(to bottom, var(--primary)/10% 1px, transparent 1px)
        `,
      }} />
      
      {/* Animated gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-transparent to-primary/5" />

      {/* Content wrapper */}
      <div className="relative z-20 flex flex-col items-center max-w-lg mx-auto px-4">
        {/* Title Animation */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center"
        >
          <h1 className="text-6xl sm:text-7xl font-bold tracking-tight bg-gradient-to-b from-primary to-primary/60 text-transparent bg-clip-text mb-6">
            Wells Analyzer
          </h1>
          <p className="text-xl text-muted-foreground">
            Advanced analytics for well engineering
          </p>
        </motion.div>

        {/* Loading Bar */}
        <motion.div
          className="relative mt-12 w-64 h-1 bg-muted/30 rounded-full overflow-hidden"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <motion.div
            className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-primary/80 to-primary rounded-full"
            initial={{ x: '-100%' }}
            animate={{ x: '0%' }}
            transition={{
              duration: 1.5,
              ease: "easeInOut"
            }}
          />
        </motion.div>
      </div>
    </div>
  );
}
