"use client";

import type { DailyAudience } from "@/lib/admin";

// Série categórica (validada p/ superfície escura #0B1026): salas x solo.
const SALAS = "#B98C33";
const SOLO = "#4F86D6";

/**
 * Barras empilhadas de sessões por dia (salas embaixo, solo em cima). O rótulo
 * de cada coluna aparece embaixo; o hover (title) traz dispositivos únicos e a
 * composição do dia. Sem dependência de lib de gráfico.
 */
export function AudienceTrend({ data }: { data: DailyAudience[] }) {
  const maxTotal = Math.max(
    1,
    ...data.map((d) => d.soloSessions + d.multiplayerSessions),
  );
  const hasData = data.some((d) => d.soloSessions + d.multiplayerSessions > 0);

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
        <div className="flex h-48 items-end gap-1.5">
          {data.map((d) => {
            const soloH = (d.soloSessions / maxTotal) * 100;
            const multiH = (d.multiplayerSessions / maxTotal) * 100;
            const soloOnTop = d.soloSessions > 0;
            return (
              <div
                key={d.key}
                className="flex h-full flex-1 flex-col justify-end"
                title={`${d.label}: ${d.uniqueDevices} disp. únicos · ${d.multiplayerSessions} salas · ${d.soloSessions} solo`}
              >
                {d.soloSessions > 0 && (
                  <div
                    className="w-full rounded-t"
                    style={{ height: `${soloH}%`, minHeight: 3, background: SOLO }}
                  />
                )}
                {d.multiplayerSessions > 0 && (
                  <div
                    className={soloOnTop ? "w-full" : "w-full rounded-t"}
                    style={{
                      height: `${multiH}%`,
                      minHeight: 3,
                      marginTop: soloOnTop ? 2 : 0,
                      background: SALAS,
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid h-48 place-items-center text-sm text-muted2">
          Sem sessões no período.
        </div>
      )}

      <div className="mt-2 flex gap-1.5">
        {data.map((d) => (
          <div key={d.key} className="flex-1 text-center text-[10px] leading-tight text-muted2">
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}
