"use client";

import { cn } from "@/lib/utils";
import type { DailyAudience } from "@/lib/admin";

// Série categórica (validada p/ superfície escura #0B1026): salas x solo.
const SALAS = "#B98C33";
const SOLO = "#4F86D6";
// Texto sobre cada cor (contraste): escuro no amarelo, claro no azul.
const SALAS_TEXT = "#0B1026";
const SOLO_TEXT = "#F5F1E8";

const BAR_PX = 192; // altura da área de barras (h-48)
const MIN_LABEL_PX = 15; // fatia menor que isso não mostra número (não caberia)

/**
 * Barras empilhadas de sessões por dia (salas embaixo, solo em cima). Cada dia é
 * uma coluna com a barra e o rótulo juntos. No mobile só os últimos 7 dias
 * aparecem (os mais antigos ficam `hidden sm:flex`), pra caber na tela; no
 * desktop mostra todos. O hover (title) traz dispositivos únicos e a composição.
 */
export function AudienceTrend({ data }: { data: DailyAudience[] }) {
  const maxTotal = Math.max(
    1,
    ...data.map((d) => d.soloSessions + d.multiplayerSessions),
  );
  const hasData = data.some((d) => d.soloSessions + d.multiplayerSessions > 0);
  const mobileCutoff = data.length - 7; // índices menores que isso somem no mobile

  return (
    <div>
      <div className="mb-4 flex items-center gap-4 text-xs text-muted2">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: SALAS }} /> Salas
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: SOLO }} /> Solo
        </span>
      </div>

      {hasData ? (
        <div className="flex items-stretch gap-1.5">
          {data.map((d, i) => {
            const soloH = (d.soloSessions / maxTotal) * 100;
            const multiH = (d.multiplayerSessions / maxTotal) * 100;
            const soloOnTop = d.soloSessions > 0;
            return (
              <div
                key={d.key}
                className={cn(
                  "min-w-0 flex-1 flex-col items-center",
                  i < mobileCutoff ? "hidden sm:flex" : "flex",
                )}
                title={`${d.label}: ${d.uniqueDevices} disp. únicos · ${d.multiplayerSessions} salas · ${d.soloSessions} solo`}
              >
                <div className="flex h-48 w-full flex-col justify-end">
                  {d.soloSessions > 0 && (
                    <div
                      className="flex w-full items-center justify-center overflow-hidden rounded-t"
                      style={{ height: `${soloH}%`, minHeight: 3, background: SOLO }}
                    >
                      {(soloH / 100) * BAR_PX >= MIN_LABEL_PX && (
                        <span className="text-[10px] font-semibold tabular-nums" style={{ color: SOLO_TEXT }}>
                          {d.soloSessions}
                        </span>
                      )}
                    </div>
                  )}
                  {d.multiplayerSessions > 0 && (
                    <div
                      className={cn(
                        "flex w-full items-center justify-center overflow-hidden",
                        soloOnTop ? "" : "rounded-t",
                      )}
                      style={{
                        height: `${multiH}%`,
                        minHeight: 3,
                        marginTop: soloOnTop ? 2 : 0,
                        background: SALAS,
                      }}
                    >
                      {(multiH / 100) * BAR_PX >= MIN_LABEL_PX && (
                        <span className="text-[10px] font-semibold tabular-nums" style={{ color: SALAS_TEXT }}>
                          {d.multiplayerSessions}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <span className="mt-2 truncate text-[10px] leading-tight text-muted2">
                  {d.label}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid h-48 place-items-center text-sm text-muted2">
          Sem sessões no período.
        </div>
      )}
    </div>
  );
}
