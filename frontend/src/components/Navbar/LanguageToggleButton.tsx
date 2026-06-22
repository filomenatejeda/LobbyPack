import { Globe2 } from "lucide-react";
import { useI18n } from "../../lib/i18n";

type LanguageToggleButtonProps = {
  className?: string;
};

export default function LanguageToggleButton({ className = "" }: LanguageToggleButtonProps) {
  const { language, t, toggleLanguage } = useI18n();

  return (
    <button
      type="button"
      className={["languageButton", className].filter(Boolean).join(" ")}
      aria-label={t("language.aria")}
      title={t("language.title")}
      onClick={toggleLanguage}
    >
      <Globe2 size={16} aria-hidden="true" />
      <span>{language.toUpperCase()}</span>
    </button>
  );
}
