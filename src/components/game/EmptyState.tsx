import Link from "next/link";
import { BookX } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}

export function EmptyState({ title, description, actionHref, actionLabel }: EmptyStateProps) {
  return (
    <div className="glass mx-auto flex max-w-md flex-col items-center gap-4 p-10 text-center">
      <BookX className="h-10 w-10 text-gold-400/70" />
      <h2 className="font-display text-xl font-semibold text-parchment">{title}</h2>
      <p className="text-sm leading-relaxed text-muted2">{description}</p>
      {actionHref && actionLabel && (
        <Link href={actionHref}>
          <Button variant="outline">{actionLabel}</Button>
        </Link>
      )}
    </div>
  );
}
