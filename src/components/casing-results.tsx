import React from 'react';

interface CasingResult {
  section: string;
  nearestBitSize: string;
  dcsg: string;
  atBody: string;
  internalDiameter: string;
}

interface CasingResultsProps {
  results: CasingResult[];
}

const CasingResults: React.FC<CasingResultsProps> = ({ results }) => {
  if (!results || results.length === 0) {
    return <div className="text-center py-4">No results available</div>;
  }

  return (
    <div className="overflow-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-primary text-primary-foreground">
            <th className="py-3 px-4 text-center border border-border/50">Section</th>
            <th className="py-3 px-4 text-center border border-border/50">Nearest Bit Size</th>
            <th className="py-3 px-4 text-center border border-border/50">DCSG</th>
            <th className="py-3 px-4 text-center border border-border/50">DCSG'</th>
            <th className="py-3 px-4 text-center border border-border/50">Internal Diameter</th>
          </tr>
        </thead>
        <tbody>
          {results.map((result, index) => (
            <tr 
              key={index} 
              className={index % 2 === 0 ? "bg-background" : "bg-muted/30"}
            >
              <td className="py-3 px-4 text-center border border-border/50">{result.section}</td>
              <td className="py-3 px-4 text-center border border-border/50">{result.nearestBitSize}</td>
              <td className="py-3 px-4 text-center border border-border/50">{result.dcsg}</td>
              <td className="py-3 px-4 text-center border border-border/50">{result.atBody}</td>
              <td className="py-3 px-4 text-center border border-border/50">{result.internalDiameter}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CasingResults; 