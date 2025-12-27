import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import type { Driver } from "@/lib/api";

interface DriverFormData {
  name: string;
  phone: string;
  password: string;
}

interface CreateDriverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Partial<Driver>) => Promise<void>;
}

const defaultForm: DriverFormData = {
  name: "",
  phone: "",
  password: "",
};

export function CreateDriverDialog({ open, onOpenChange, onSubmit }: CreateDriverDialogProps) {
  const [form, setForm] = useState<DriverFormData>(defaultForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!form.name || !form.phone || !form.password) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(form);
      setForm(defaultForm);
      onOpenChange(false);
    } catch (err) {
      // Error handled by parent
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setForm(defaultForm);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Nouveau Livreur
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Créer un livreur</DialogTitle>
          <DialogDescription>
            Remplissez les informations pour créer un nouveau livreur
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
            <Label>Mot de passe *</Label>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Mot de passe (min 6 caractères)"
            />
          </div>
          <Button onClick={handleSubmit} className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Création..." : "Créer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

