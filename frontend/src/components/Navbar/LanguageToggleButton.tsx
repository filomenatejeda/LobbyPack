import { Globe2 } from "lucide-react";
import { useI18nContext } from "../../i18n/i18n-react";

type LanguageToggleButtonProps = {
  className?: string;
};

export default function LanguageToggleButton({ className = "" }: LanguageToggleButtonProps) {
  const { LL, locale, setLocale } = useI18nContext();

  return (
    <button
      type="button"
      className={["languageButton", className].filter(Boolean).join(" ")}
      aria-label="Cambiar idioma proximamente"
      title="Cambio de idioma proximamente"
      onClick={() => locale === "es" ? setLocale("en") : setLocale("es") }
    >
      <Globe2 size={16} aria-hidden="true" />
      <span>{LL.language_code()}</span>
    </button>
  );
}
