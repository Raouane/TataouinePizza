import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Driver } from "@/lib/api";

interface DriverFormData {
  name: string;
  phone: string;
  password: string;
  status: "available" | "offline" | "on_delivery";
}

interface EditDriverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver: Driver | null;
  onSubmit: (id: string, data: Partial<Driver>) => Promise<void>;
  onCancel: () => void;
}

const defaultForm: DriverFormData = {
  name: "",
  phone: "",
  password: "",
  status: "available",
};

export function EditDriverDialog({ open, onOpenChange, driver, onSubmit, onCancel }: EditDriverDialogProps) {
  const [form, setForm] = useState<DriverFormData>(defaultForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (driver && open) {
      setForm({
        name: driver.name,
        phone: driver.phone,
        password: "", // Ne pas pré-remplir le mot de passe
        status: (driver.status as "available" | "offline" | "on_delivery") || "available",
      });
    }
  }, [driver, open]);

  const handleSubmit = async () => {
    if (!driver) return;
    
    if (!form.name || !form.phone) {
      return;
    }

    setIsSubmitting(true);
    try {
      const updateData: { name: string; phone: string; password?: string; status: string } = {
        name: form.name,
        phone: form.phone,
        status: form.status,
      };
      if (form.password && form.password.trim() !== "") {
        updateData.password = form.password;
      }
      console.log("[EditDriverDialog] Envoi des données:", updateData);
      await onSubmit(driver.id, updateData);
      onOpenChange(false);
      onCancel();
    } catch (err) {
      console.error("[EditDriverDialog] Erreur:", err);
      // Error handled by parent
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setForm(defaultForm);
    onOpenChange(false);
    onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier le livreur</DialogTitle>
          <DialogDescription>
            Modifiez les informations du livreur. Laissez le mot de passe vide pour ne pas le modifier.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Nom *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nom du livreur"
            />
          </div>
          <div>
            <Label>Téléphone *</Label>
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="21612345678"
            />
          </div>
          <div>
            <Label>Nouveau mot de passe (optionnel)</Label>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Laissez vide pour ne pas modifier"
            />
          </div>
          <div>
            <Label>Statut *</Label>
            <select
              value={form.status}
              onChange={(e) => {
                const newStatus = e.target.value as DriverFormData["status"];
                console.log("[EditDriverDialog] Changement de statut:", newStatus);
                setForm({ ...form, status: newStatus });
              }}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="available">✅ Disponible (peut recevoir des commandes)</option>
              <option value="on_delivery">🚚 En livraison (en cours de livraison)</option>
              <option value="offline">❌ Hors ligne (indisponible)</option>
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              Statut actuel: <strong>{form.status}</strong>
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSubmit} className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? "Enregistrement..." : "Enregistrer"}
            </Button>
            <Button variant="outline" onClick={handleCancel}>
              Annuler
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

