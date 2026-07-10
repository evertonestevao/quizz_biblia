import { cn } from "@/lib/utils";

const INSTAGRAM_URL = "https://www.instagram.com/cristao.quiz";
const INSTAGRAM_HANDLE = "@cristao.quiz";

/** Glyph do Instagram no estilo dos ícones lucide (traço 2px, cantos redondos). */
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

/**
 * Link para o Instagram do Cristão Quiz. Por padrão mostra ícone + @handle;
 * passe `iconOnly` para exibir só o ícone.
 */
export function InstagramLink({
  className,
  iconOnly = false,
}: {
  className?: string;
  iconOnly?: boolean;
}) {
  return (
    <a
      href={INSTAGRAM_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Instagram do Cristão Quiz (${INSTAGRAM_HANDLE})`}
      className={cn(
        "inline-flex items-center gap-2 text-muted2 transition-colors hover:text-gold-300",
        className,
      )}
    >
      <InstagramIcon className="h-5 w-5" />
      {!iconOnly && (
        <span className="text-xs font-medium">Siga {INSTAGRAM_HANDLE} no Instagram</span>
      )}
    </a>
  );
}
