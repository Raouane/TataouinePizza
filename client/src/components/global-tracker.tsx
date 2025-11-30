import { useState } from "react";
import { useOrder } from "@/lib/order-context";
import { useLanguage } from "@/lib/i18n";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp, ChevronDown, Bike, Clock, Phone } from "lucide-react";
import { OrderTracker } from "@/components/order-tracker";
import { Button } from "@/components/ui/button";

export function GlobalTrackerWidget() {
  const { activeOrder, status, eta } = useOrder();
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const isDelivering = status === 'delivery';

  if (!activeOrder) return null;

  return (
    <div className="fixed bottom-[4.5rem] md:bottom-6 right-4 left-4 md:left-auto md:w-96 z-50">
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="bg-card border rounded-2xl shadow-2xl p-4 mb-4 max-h-[60vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-serif font-bold">{t('tracker.title')}</h3>
              <Button variant="ghost" size="icon" onClick={() => setExpanded(false)}>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
            <OrderTracker />
            {isDelivering && (
              <a href="tel:+21698765432" className="block mt-4">
                <Button size="sm" className="w-full bg-green-600 hover:bg-green-700 rounded-lg">
                  <Phone className="h-4 w-4 mr-2" />
                  {t('success.call_driver')}
                </Button>
              </a>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        layout
        className="bg-primary text-primary-foreground rounded-xl shadow-lg p-4 cursor-pointer flex items-center justify-between"
        onClick={() => setExpanded(!expanded)}
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-full">
             <Bike className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <p className="font-bold text-sm">
              {t(`tracker.status.${status}`)}
            </p>
            <p className="text-xs opacity-90 flex items-center gap-1">
              <Clock className="h-3 w-3" /> {t('tracker.eta')} {eta} {t('tracker.min')}
            </p>
          </div>
        </div>
        <ChevronUp className={`h-5 w-5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </motion.div>
    </div>
  );
}
