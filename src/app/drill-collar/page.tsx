import { NavBar } from "@/components/nav-bar";
import DrillCollarCalculator from "@/components/drill-collar-calculator";

export const metadata = {
  title: "Drill Collar Calculator | Wells Analyzer",
  description: "Calculate drill collar values and pipe data based on well parameters",
};

export default function DrillCollarPage() {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background text-foreground">
      <NavBar />
      <div className="flex-1 overflow-auto p-6 md:p-8 lg:p-10">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 text-transparent bg-clip-text">
              Drill Collar Calculator
            </h1>
          </div>
          
          <DrillCollarCalculator />
        </div>
      </div>
    </div>
  );
} 