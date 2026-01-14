import { useState, useEffect } from "react";

interface AppSetting {
  key: string;
  value: string;
  description?: string | null;
  updatedAt: string;
  updatedBy?: string | null;
}

interface UseAppSettingsReturn {
  settings: AppSetting[];
  loading: boolean;
  error: Error | null;
  getSetting: (key: string) => string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook pour récupérer les settings de l'application
 */
export function useAppSettings(): UseAppSettingsReturn {
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/settings");
      if (!response.ok) {
        throw new Error("Failed to fetch settings");
      }
      const data = await response.json();
      setSettings(data.settings || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const getSetting = (key: string): string | null => {
    const setting = settings.find(s => s.key === key);
    return setting?.value ?? null;
  };

  return {
    settings,
    loading,
    error,
    getSetting,
    refetch: fetchSettings,
  };
}

/**
 * Hook pour récupérer un setting spécifique (pour usage public, sans auth)
 */
export function usePublicSetting(key: string, defaultValue: string = "true"): string {
  const [value, setValue] = useState<string>(defaultValue);

  useEffect(() => {
    const fetchSetting = async () => {
      try {
        // Route publique pour récupérer un setting spécifique
        const response = await fetch(`/api/settings/${key}`);
        if (response.ok) {
          const data = await response.json();
          setValue(data.setting?.value ?? defaultValue);
        } else if (response.status === 404) {
          // Si la route n'existe pas encore (serveur pas redémarré), utiliser la valeur par défaut
          // Pas besoin de logger l'erreur, c'est normal si le serveur n'a pas été redémarré
          setValue(defaultValue);
        } else {
          // Autre erreur, utiliser la valeur par défaut
          setValue(defaultValue);
        }
      } catch (err) {
        // Erreur réseau ou autre, utiliser la valeur par défaut
        // Ne pas logger en production pour éviter le bruit dans la console
        if (process.env.NODE_ENV === 'development') {
          console.warn(`[usePublicSetting] Impossible de récupérer le setting ${key}, utilisation de la valeur par défaut:`, defaultValue);
        }
        setValue(defaultValue);
      }
    };

    fetchSetting();
  }, [key, defaultValue]);

  return value;
}
