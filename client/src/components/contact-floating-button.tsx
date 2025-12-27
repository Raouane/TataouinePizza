import { Phone, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

// Numéro de téléphone de support
const PHONE_NUMBER = "21653666945"; // +216 53 666 945

export function ContactFloatingButton() {
  const handlePhone = () => {
    window.location.href = `tel:+${PHONE_NUMBER}`;
  };

  const handleWhatsApp = () => {
    // Ouvrir WhatsApp avec le numéro (format international sans +)
    window.open(`https://wa.me/${PHONE_NUMBER}`, '_blank');
  };

  return (
    <div className="fixed bottom-20 md:bottom-8 right-4 z-50 flex flex-col gap-3">
      {/* Bouton WhatsApp */}
      <motion.div
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <Button
          onClick={handleWhatsApp}
          className="h-14 w-14 rounded-full bg-[#25D366] hover:bg-[#20BA5A] text-white shadow-lg flex items-center justify-center"
          size="icon"
          aria-label="Contacter sur WhatsApp"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </motion.div>

      {/* Bouton Téléphone */}
      <motion.div
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <Button
          onClick={handlePhone}
          className="h-14 w-14 rounded-full bg-primary hover:bg-primary/90 text-white shadow-lg flex items-center justify-center"
          size="icon"
          aria-label="Appeler le support"
        >
          <Phone className="h-6 w-6" />
        </Button>
      </motion.div>
    </div>
  );
}

