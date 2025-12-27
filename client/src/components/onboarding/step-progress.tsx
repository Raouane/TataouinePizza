import { motion } from "framer-motion";

type Step = "phone" | "otp" | "location";

interface StepProgressProps {
  currentStep: Step;
}

const steps: Step[] = ["phone", "otp", "location"];

export function StepProgress({ currentStep }: StepProgressProps) {
  const currentIndex = steps.indexOf(currentStep);

  return (
    <div className="flex justify-center gap-2 mt-2">
      {steps.map((step, index) => (
        <motion.div
          key={step}
          className={`w-3 h-3 rounded-full ${
            index <= currentIndex ? "bg-orange-600" : "bg-orange-200"
          }`}
          initial={{ scale: 0.8 }}
          animate={{ scale: index === currentIndex ? 1.2 : 1 }}
          transition={{ duration: 0.2 }}
        />
      ))}
    </div>
  );
}

