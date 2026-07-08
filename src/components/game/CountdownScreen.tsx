interface CountdownScreenProps {
  secondsLeft: number;
}

/** Tela cheia de "Prepare-se" com o contador regressivo sincronizado. */
export function CountdownScreen({ secondsLeft }: CountdownScreenProps) {
  const display = Math.max(0, secondsLeft);

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-24 text-center">
      <p className="animate-fadeUp text-sm font-semibold uppercase tracking-[0.25em] text-gold-400">
        Prepare-se
      </p>
      <p className="animate-fadeUp font-display text-2xl font-bold text-parchment sm:text-3xl">
        O jogo vai começar!
      </p>
      <div className="glass-strong gold-frame flex h-40 w-40 items-center justify-center rounded-full sm:h-48 sm:w-48">
        <span
          key={display}
          className="animate-popIn font-display text-7xl font-bold gold-text sm:text-8xl"
        >
          {display}
        </span>
      </div>
    </div>
  );
}
