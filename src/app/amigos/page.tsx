"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, LogIn } from "lucide-react";

export default function AmigosPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  function handleJoin() {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length < 4) {
      setError("Digite o código da sala (ex.: ABC123).");
      return;
    }
    setError("");
    router.push(`/amigos/sala/${trimmed}`);
  }

  return (
    <main className="min-h-dvh">
      <AppHeader />
      <div className="mx-auto max-w-md space-y-4 px-5 py-10">
        <Card className="animate-fadeUp space-y-4 p-7">
          <span className="grid h-12 w-12 place-items-center rounded-xl border border-gold-500/40 bg-gold-500/10 text-gold-300">
            <PlusCircle className="h-6 w-6" />
          </span>
          <div>
            <CardTitle className="text-xl">Criar uma sala</CardTitle>
            <CardDescription className="mt-1.5">
              Defina o tempo por pergunta e a quantidade de rodadas, depois convide seus amigos.
            </CardDescription>
          </div>
          <Link href="/amigos/criar" className="block">
            <Button className="w-full" size="lg">
              Criar sala
            </Button>
          </Link>
        </Card>

        <Card className="animate-fadeUp space-y-4 p-7" style={{ animationDelay: "120ms" }}>
          <span className="grid h-12 w-12 place-items-center rounded-xl border border-gold-500/40 bg-gold-500/10 text-gold-300">
            <LogIn className="h-6 w-6" />
          </span>
          <div>
            <CardTitle className="text-xl">Entrar em uma sala</CardTitle>
            <CardDescription className="mt-1.5">
              Recebeu um código? Digite abaixo para entrar na partida.
            </CardDescription>
          </div>
          <div>
            <Label htmlFor="room-code">Código da sala</Label>
            <Input
              id="room-code"
              value={code}
              maxLength={8}
              placeholder="ABC123"
              className="text-center font-display text-xl tracking-[0.35em] uppercase"
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              onKeyDown={(event) => event.key === "Enter" && handleJoin()}
            />
            {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
          </div>
          <Button variant="outline" className="w-full" size="lg" onClick={handleJoin}>
            Entrar na sala
          </Button>
        </Card>
      </div>
    </main>
  );
}
