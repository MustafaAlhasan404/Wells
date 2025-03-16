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
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-4">          
          <DrillCollarCalculator />
        </div>
      </div>
    </div>
  );
} 