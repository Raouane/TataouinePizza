import { useOrder } from "@/lib/order-context";
import { useLanguage } from "@/lib/i18n";
import { motion } from "framer-motion";
import { Bike, Clock, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";

export function GlobalTrackerWidget() {
  const { activeOrder, status, eta } = useOrder();
  const { t } = useLanguage();
  const [, setLocation] = useLocation();

  if (!activeOrder) return null;

  return (
    <motion.div
      className="fixed bottom-[4.5rem] md:bottom-6 right-4 z-50"
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="bg-orange-600 text-white rounded-full shadow-lg px-3 py-1.5 cursor-pointer flex items-center gap-2 hover:bg-orange-700 transition-colors w-auto max-w-[200px]"
        onClick={() => setLocation('/success')}
        whileTap={{ scale: 0.98 }}
        whileHover={{ scale: 1.02 }}
      >
        <div className="bg-white/20 p-1 rounded-full flex-shrink-0">
          <Bike className="h-3.5 w-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[11px] leading-tight whitespace-nowrap">
            {t('tracker.title')}
          </p>
          <p className="text-[9px] opacity-90 flex items-center gap-1 leading-tight whitespace-nowrap">
            <Clock className="h-2.5 w-2.5 flex-shrink-0" /> 
            {eta} {t('tracker.min')}
          </p>
        </div>
        <ArrowRight className="h-3.5 w-3.5 flex-shrink-0" />
      </motion.div>
    </motion.div>
  );
}
