import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import type { Driver } from "@/lib/api";

interface DriverAdminCardProps {
  driver: Driver;
  onEdit: (driver: Driver) => void;
  onDelete: () => void;
}

export function DriverAdminCard({ driver, onEdit, onDelete }: DriverAdminCardProps) {
  return (
    <Card className="p-3 sm:p-4">
      <div className="flex justify-between items-start mb-2 gap-2">
        <h3 className="font-bold text-base sm:text-lg break-words flex-1">{driver.name}</h3>
        <div className="flex gap-1 sm:gap-2 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(driver)}
            className="h-8 w-8 p-0"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{driver.phone}</p>
      <div className="mt-2">
        <span className={`text-xs px-2 py-1 rounded font-medium ${
          driver.status === 'available' ? 'bg-green-100 text-green-800' :
          driver.status === 'on_delivery' ? 'bg-orange-100 text-orange-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {driver.status === 'available' ? '✅ Disponible' :
           driver.status === 'on_delivery' ? '🚚 En livraison' :
           driver.status === 'offline' ? '❌ Hors ligne' :
           driver.status}
        </span>
      </div>
    </Card>
  );
}

