import { Search } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  const { t } = useLanguage();
  
  return (
    <section className="px-4 pt-6 pb-4 relative z-20">
      <div className="max-w-4xl mx-auto">
        <div className="relative bg-white rounded-xl shadow-lg">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder={t('home.search.placeholder')}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full pl-12 pr-4 py-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-800"
          />
        </div>
      </div>
    </section>
  );
}

