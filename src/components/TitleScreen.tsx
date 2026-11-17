import { Users, Play, Grid } from 'lucide-react';
import { PicoLogoSvg } from './PicoLogoSvg';

interface TitleScreenProps {
  onStartLocal: () => void;
  onOpenLan: () => void;
  onOpenStages: () => void;
}

export function TitleScreen({
  onStartLocal,
  onOpenLan,
  onOpenStages,
}: TitleScreenProps) {
  return (
    <div className="fixed inset-0 z-20 flex flex-col items-center justify-between pointer-events-none px-4 py-5 sm:py-8">
      {/* Upper Calm Negative Space: Title Lockup & Clean Actions */}
      <div className="flex flex-col items-center w-full max-w-xl pointer-events-auto">
        <PicoLogoSvg className="w-[290px] sm:w-[410px] h-auto drop-shadow-none" />

        <div className="mt-5 sm:mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            data-start="true"
            onClick={onStartLocal}
            className="inline-flex items-center gap-2 px-6 py-3 min-h-[46px] bg-[#F48C42] hover:bg-[#E57B30] active:translate-y-0.5 text-white font-bold text-base tracking-wide border-[3px] border-[#1A1A1A] shadow-[4px_4px_0_#1A1A1A] transition-transform cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A1A1A]"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Play Local</span>
          </button>

          <button
            type="button"
            onClick={onOpenLan}
            className="inline-flex items-center gap-2 px-5 py-3 min-h-[46px] bg-white hover:bg-neutral-50 active:translate-y-0.5 text-[#1A1A1A] font-bold text-base border-[3px] border-[#1A1A1A] shadow-[4px_4px_0_#1A1A1A] transition-transform cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A1A1A]"
          >
            <Users className="w-4 h-4" />
            <span>LAN Mabar</span>
          </button>

          <button
            type="button"
            onClick={onOpenStages}
            className="inline-flex items-center gap-2 px-4 py-3 min-h-[46px] bg-white hover:bg-neutral-50 active:translate-y-0.5 text-[#1A1A1A] font-bold text-base border-[3px] border-[#1A1A1A] shadow-[4px_4px_0_#1A1A1A] transition-transform cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A1A1A]"
          >
            <Grid className="w-4 h-4" />
            <span>Stages</span>
          </button>
        </div>
      </div>

      {/* Bottom Safe Margin: Single Flat Control Hint Line */}
      <p className="text-xs sm:text-sm font-bold text-[#1A1A1A] px-3 py-1 text-center">
        WASD / Arrows Move · Space Jump · Tab Switch Cat · Esc Pause · Touch Ready
      </p>
    </div>
  );
}
