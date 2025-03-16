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
      {/* Background gradient effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-background z-0" />
      
      {/* Animated particles/dots */}
      <div className="absolute inset-0 z-10 opacity-20">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-primary"
            initial={{
              x: Math.random() * 100 - 50 + "%",
              y: Math.random() * 100 - 50 + "%",
              scale: Math.random() * 0.5 + 0.5,
              opacity: Math.random() * 0.5 + 0.2,
            }}
            animate={{
              x: Math.random() * 100 - 50 + "%", 
              y: Math.random() * 100 - 50 + "%",
              opacity: Math.random() * 0.5 + 0.2,
            }}
            transition={{
              duration: 6 + Math.random() * 4,
              ease: "easeInOut",
              repeat: Infinity,
              repeatType: "reverse",
            }}
            style={{
              width: (Math.random() * 10 + 5) + "px",
              height: (Math.random() * 10 + 5) + "px",
            }}
          />
        ))}
      </div>

      {/* Content wrapper */}
      <div className="relative z-20 flex flex-col items-center">
        {/* Logo Animation with glow effect */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="relative mb-6"
        >
          <div className="absolute -inset-2 rounded-full bg-primary/20 blur-xl animate-pulse" />
          <div className="relative bg-background rounded-full p-5 shadow-lg">
            <MountainIcon className="h-16 w-16 text-primary" />
          </div>
        </motion.div>

        {/* Title Animation */}
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-5xl sm:text-6xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 text-transparent bg-clip-text text-center relative"
        >
          Wells Analyzer
        </motion.h1>

        {/* Subtitle Animation */}
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-4 text-xl text-muted-foreground text-center"
        >
          Advanced analytics for well engineering
        </motion.p>

        {/* Loading Indicator */}
        <motion.div
          className="relative mt-10 w-48 h-1.5 bg-muted rounded-full overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.8 }}
        >
          <motion.div
            className="absolute top-0 left-0 h-full bg-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
          />
        </motion.div>
      </div>
    </div>
  );
}
