import { AlertCircle } from "lucide-react";

interface StepErrorProps {
  error: string | null;
  step: string;
  currentStep: string;
}

export function StepError({ error, step, currentStep }: StepErrorProps) {
  if (!error || step !== currentStep) return null;

  return (
    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
      <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
      <p className="text-sm text-red-600">{error}</p>
    </div>
  );
}


