"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { PlayerNameForm } from "@/components/room/PlayerNameForm";
import { getSoloName, getSoloVersion, saveSoloName, saveSoloVersion } from "@/lib/storage";
import { BIBLE_VERSIONS, DEFAULT_VERSION_ID } from "@/lib/versions";
import { BookOpen } from "lucide-react";

export default function SoloPage() {
  const router = useRouter();
  const [initialName, setInitialName] = useState("");
  const [version, setVersion] = useState<string>(DEFAULT_VERSION_ID);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setInitialName(getSoloName());
    setVersion(getSoloVersion());
    setReady(true);
  }, []);

  function handleStart(name: string) {
    saveSoloName(name);
    saveSoloVersion(version);
    router.push("/solo/jogar");
  }

  return (
    <main className="min-h-dvh">
      <AppHeader />
      <div className="mx-auto max-w-md px-5 py-10">
        <Card className="animate-fadeUp space-y-5 p-7">
          <span className="grid h-12 w-12 place-items-center rounded-xl border border-gold-500/40 bg-gold-500/10 text-gold-300">
            <BookOpen className="h-6 w-6" />
          </span>
          <div>
            <CardTitle className="text-2xl">Modo Solo</CardTitle>
            <CardDescription className="mt-1.5">
              Responda quantas perguntas quiser e acompanhe sua taxa de acerto.
            </CardDescription>
          </div>
          {ready && (
            <>
              <div>
                <Label htmlFor="solo-version">Versão da Bíblia</Label>
                <Select
                  id="solo-version"
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
              <PlayerNameForm
                initialName={initialName}
                buttonLabel="Começar a jogar"
                onSubmit={handleStart}
              />
            </>
          )}
        </Card>
      </div>
    </main>
  );
}
