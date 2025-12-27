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
      const updateData: { name: string; phone: string; password?: string } = {
        name: form.name,
        phone: form.phone,
      };
      if (form.password && form.password.trim() !== "") {
        updateData.password = form.password;
      }
      await onSubmit(driver.id, updateData);
      onOpenChange(false);
      onCancel();
    } catch (err) {
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

