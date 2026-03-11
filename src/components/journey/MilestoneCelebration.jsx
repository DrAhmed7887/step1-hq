import { useEffect } from "react";
import confetti from "canvas-confetti";
import successJingle from "../../assets/ninja/Success1.wav";

export default function MilestoneCelebration({ milestone, soundEnabled = false, onDone }) {
  useEffect(() => {
    if (!milestone) {
      return undefined;
    }

    confetti({
      particleCount: 80,
      spread: 70,
      startVelocity: 26,
      gravity: 0.9,
      scalar: 0.85,
      colors: ["#32c6b7", "#8cd17d", "#f8b84e", "#0f1b2d"]
    });

    let audio;
    if (soundEnabled) {
      audio = new Audio(successJingle);
      audio.volume = 0.3;
      audio.play().catch(() => {});
    }

    const timeoutId = window.setTimeout(() => {
      onDone?.();
    }, 1800);

    return () => {
      window.clearTimeout(timeoutId);
      if (audio) {
        audio.pause();
      }
    };
  }, [milestone, onDone, soundEnabled]);

  if (!milestone) {
    return null;
  }

  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-50 animate-milestone-flash bg-teal/20" />
      <div className="pointer-events-none fixed inset-x-0 top-5 z-50 flex justify-center px-4">
        <div className="panel-soft border-teal/40 bg-teal/10 px-4 py-3 text-center shadow-panel">
          <p className="text-[11px] uppercase tracking-[0.2em] text-teal">Milestone Locked</p>
          <p className="mt-1 text-sm font-semibold text-white">{milestone.label}</p>
        </div>
      </div>
    </>
  );
}
