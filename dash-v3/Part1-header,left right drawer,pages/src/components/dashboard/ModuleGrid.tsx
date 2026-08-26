import type { OrchestrationModule } from "../../types";
import { ModuleCard } from "../ui/ModuleCard";

interface ModuleGridProps {
  modules: OrchestrationModule[];
  onSelect: (module: OrchestrationModule) => void;
}

export function ModuleGrid({ modules, onSelect }: ModuleGridProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {modules.map((module) => (
        <ModuleCard key={module.id} module={module} onSelect={onSelect} />
      ))}
    </div>
  );
}
