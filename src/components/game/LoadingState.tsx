import { LoaderCircle } from "lucide-react";

export function LoadingState({ message = "Carregando..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <LoaderCircle className="h-9 w-9 animate-spin text-gold-300" />
      <p className="text-sm text-muted2">{message}</p>
    </div>
  );
}
