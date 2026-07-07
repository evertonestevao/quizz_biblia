"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PlayerNameFormProps {
  initialName?: string;
  buttonLabel: string;
  loading?: boolean;
  onSubmit: (name: string) => void;
}

export function PlayerNameForm({
  initialName = "",
  buttonLabel,
  loading,
  onSubmit,
}: PlayerNameFormProps) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState("");

  function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Digite seu nome para continuar.");
      return;
    }
    setError("");
    onSubmit(trimmed);
  }

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="player-name">Seu nome</Label>
        <Input
          id="player-name"
          value={name}
          maxLength={24}
          placeholder="Ex.: Débora"
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && handleSubmit()}
          autoFocus
        />
        {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
      </div>
      <Button className="w-full" size="lg" onClick={handleSubmit} disabled={loading}>
        {loading ? "Aguarde..." : buttonLabel}
      </Button>
    </div>
  );
}
