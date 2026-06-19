import { Globe2 } from "lucide-react";

type LanguageToggleButtonProps = {
  className?: string;
};

export default function LanguageToggleButton({ className = "" }: LanguageToggleButtonProps) {
  return (
    <button
      type="button"
      className={["languageButton", className].filter(Boolean).join(" ")}
      aria-label="Cambiar idioma proximamente"
      title="Cambio de idioma proximamente"
    >
      <Globe2 size={16} aria-hidden="true" />
      <span>ES</span>
    </button>
  );
}
