import { Button } from "@/components/ui/button";
import Link from "next/link";
import { NavBar } from "@/components/nav-bar";
import { ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background text-foreground">
      <NavBar />
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center px-4 sm:px-6 md:px-8">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 text-transparent bg-clip-text">
            Wells Analyzer
          </h1>
          <p className="max-w-[700px] mx-auto mt-4 text-base sm:text-lg text-muted-foreground">
            Advanced analytics and design tools for well engineering
          </p>
          
          <div className="flex justify-center mt-12">
            <Link href="/data-input">
              <Button variant="default" size="lg" className="gap-2 w-full sm:w-auto bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary">
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
