"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createRoom, trackPlayerLocation } from "@/lib/room";
import { saveSession } from "@/lib/storage";
import { isSupabaseConfigured } from "@/lib/supabase";
import { BIBLE_VERSIONS, DEFAULT_VERSION_ID } from "@/lib/versions";
import { Users } from "lucide-react";

const DURATIONS = [10, 15, 20, 30, 45, 60];
const COUNTS = [5, 10, 15, 20, 30];

export default function CriarSalaPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [duration, setDuration] = useState(20);
  const [count, setCount] = useState(10);
  const [version, setVersion] = useState<string>(DEFAULT_VERSION_ID);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Digite seu nome para criar a sala.");
      return;
    }
    if (!isSupabaseConfigured) {
      setError(
        "Supabase não configurado. Preencha o arquivo .env.local para jogar com amigos. O Modo Solo funciona sem configuração.",
      );
      return;
    }
    setError("");
    setLoading(true);
    try {
      const { room, player } = await createRoom({
        hostName: trimmed,
        questionDuration: duration,
        questionCount: count,
        bibleVersion: version,
      });
      trackPlayerLocation(room.id);
      saveSession({
        playerId: player.id,
        playerName: player.name,
        roomCode: room.code,
        roomId: room.id,
      });
      router.push(`/amigos/sala/${room.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar a sala.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-dvh">
      <AppHeader />
      <div className="mx-auto max-w-md px-5 py-10">
        <Card className="animate-fadeUp space-y-5 p-7">
          <span className="grid h-12 w-12 place-items-center rounded-xl border border-gold-500/40 bg-gold-500/10 text-gold-300">
            <Users className="h-6 w-6" />
          </span>
          <div>
            <CardTitle className="text-2xl">Criar sala</CardTitle>
            <CardDescription className="mt-1.5">
              Você será o anfitrião: só você poderá iniciar a partida.
            </CardDescription>
          </div>

          <div>
            <Label htmlFor="host-name">Seu nome</Label>
            <Input
              id="host-name"
              value={name}
              maxLength={24}
              placeholder="Ex.: João"
              onChange={(event) => setName(event.target.value)}
              autoFocus
            />
          </div>

          <div>
            <Label htmlFor="version">Versão da Bíblia</Label>
            <Select
              id="version"
              value={version}
              onChange={(event) => setVersion(event.target.value)}
            >
              {BIBLE_VERSIONS.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="duration">Tempo por pergunta</Label>
              <Select
                id="duration"
                value={duration}
                onChange={(event) => setDuration(Number(event.target.value))}
              >
                {DURATIONS.map((value) => (
                  <option key={value} value={value}>
                    {value} segundos
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="count">Perguntas</Label>
              <Select
                id="count"
                value={count}
                onChange={(event) => setCount(Number(event.target.value))}
              >
                {COUNTS.map((value) => (
                  <option key={value} value={value}>
                    {value} perguntas
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {error && <p className="text-sm text-red-300">{error}</p>}

          <Button
            className="w-full"
            size="lg"
            onClick={handleCreate}
            disabled={loading}
          >
            {loading ? "Criando sala..." : "Criar sala e gerar código"}
          </Button>
        </Card>
      </div>
    </main>
  );
}
