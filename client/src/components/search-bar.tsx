import { Search } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  const { t } = useLanguage();
  
  return (
    <section className="px-3 md:px-4 pt-4 md:pt-6 pb-3 md:pb-4 relative z-20">
      <div className="max-w-4xl mx-auto">
        <div className="relative bg-white rounded-lg md:rounded-xl shadow-md md:shadow-lg">
          <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-400" />
          <input
            type="text"
            placeholder={t('home.search.placeholder')}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full pl-10 md:pl-12 pr-3 md:pr-4 py-3 md:py-4 rounded-lg md:rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm md:text-base text-gray-800 placeholder:text-gray-400"
          />
        </div>
      </div>
    </section>
  );
}

