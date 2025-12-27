import { DriverAdminCard } from "./driver-admin-card";
import { CreateDriverDialog } from "./create-driver-dialog";
import { EditDriverDialog } from "./edit-driver-dialog";
import type { Driver } from "@/lib/api";

interface DriversTabProps {
  drivers: Driver[];
  loading?: boolean;
  showCreateDialog: boolean;
  showEditDialog: boolean;
  editingDriver: Driver | null;
  onOpenCreateDialog: () => void;
  onCloseCreateDialog: () => void;
  onOpenEditDialog: (driver: Driver) => void;
  onCloseEditDialog: () => void;
  onCreate: (data: Partial<Driver>) => Promise<void>;
  onUpdate: (id: string, data: Partial<Driver>) => Promise<void>;
  onDelete: (driver: Driver) => void;
}

export function DriversTab({
  drivers,
  loading = false,
  showCreateDialog,
  showEditDialog,
  editingDriver,
  onOpenCreateDialog,
  onCloseCreateDialog,
  onOpenEditDialog,
  onCloseEditDialog,
  onCreate,
  onUpdate,
  onDelete,
}: DriversTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-2">
        <h2 className="text-xl font-bold">Livreurs</h2>
        <CreateDriverDialog
          open={showCreateDialog}
          onOpenChange={(open) => open ? onOpenCreateDialog() : onCloseCreateDialog()}
          onSubmit={onCreate}
        />
      </div>
      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Chargement des livreurs...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {drivers.map((driver) => (
            <DriverAdminCard
              key={driver.id}
              driver={driver}
              onEdit={onOpenEditDialog}
              onDelete={() => onDelete(driver)}
            />
          ))}
          {drivers.length === 0 && (
            <p className="text-muted-foreground col-span-full text-center py-8">
              Aucun livreur. Créez-en un pour commencer.
            </p>
          )}
        </div>
      )}
      
      <EditDriverDialog
        open={showEditDialog}
        onOpenChange={(open) => open ? onOpenEditDialog(editingDriver!) : onCloseEditDialog()}
        driver={editingDriver}
        onSubmit={onUpdate}
        onCancel={onCloseEditDialog}
      />
    </div>
  );
}

