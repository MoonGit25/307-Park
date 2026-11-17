import { useEffect, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Laptop,
  Play,
  Smartphone,
  X,
} from 'lucide-react';
import { getLevelsByBracket, getRecommendedBracketForCount, LEVELS } from '../game/levels';
import {
  PALETTE_BY_ID,
  PLAYER_PALETTES,
  type PlayerBracket,
  type PlayerColorId,
  type RoomStatePayload,
} from '../game/types';

interface LanInfoResponse {
  port: number;
  ips: string[];
  primaryUrl: string;
  joinUrl: string;
  qrDataUrl: string;
}

interface LobbyModalProps {
  room: RoomStatePayload | null;
  playerId: string | null;
  error: string | null;
  initialJoinCode?: string;
  playerName: string;
  playerColor: PlayerColorId;
  onChangeName: (name: string) => void;
  onChangeColor: (color: PlayerColorId) => void;
  onCreateRoom: () => void;
  onJoinRoom: (code: string) => void;
  onSelectStage: (stageIdx: number) => void;
  onStartGame: () => void;
  onLeaveRoom: () => void;
  onClose: () => void;
}

const BRACKET_TABS: Array<{ id: PlayerBracket; label: string; desc: string }> = [
  { id: '2p', label: '2 Player', desc: '2 cats' },
  { id: '3p', label: '3 Player', desc: '3 cats' },
  { id: '4p', label: '4 Player', desc: '4 cats' },
  { id: '5p', label: '5 Player', desc: '5 cats' },
  { id: '6p', label: '6+ Player', desc: '6-8 cats' },
];

export function LobbyModal({
  room,
  playerId,
  error,
  initialJoinCode = '',
  playerName,
  playerColor,
  onChangeName,
  onChangeColor,
  onCreateRoom,
  onJoinRoom,
  onSelectStage,
  onStartGame,
  onLeaveRoom,
  onClose,
}: LobbyModalProps) {
  const [joinCode, setJoinCode] = useState(initialJoinCode.toUpperCase());
  const [lanInfo, setLanInfo] = useState<LanInfoResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [activeBracket, setActiveBracket] = useState<PlayerBracket>('2p');

  useEffect(() => {
    if (initialJoinCode) {
      setJoinCode(initialJoinCode.toUpperCase());
    }
  }, [initialJoinCode]);

  // Keep bracket tab synced with currently selected stage or auto-recommend when room member count changes
  useEffect(() => {
    if (!room) return;
    const currentLvl = LEVELS[room.stageIndex];
    if (currentLvl) {
      setActiveBracket(currentLvl.bracket);
    }
  }, [room?.stageIndex]);

  useEffect(() => {
    let active = true;
    const query = room ? `?room=${encodeURIComponent(room.code)}` : '';
    fetch(`/api/lan-info${query}`)
      .then((r) => r.json())
      .then((data: LanInfoResponse) => {
        if (active) setLanInfo(data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [room?.code]);

  const isHost = Boolean(room && playerId && room.hostId === playerId);
  const currentStage = LEVELS[room?.stageIndex ?? 0] ?? LEVELS[0];
  const bracketStages = getLevelsByBracket(activeBracket);
  const recommendedBracket = room ? getRecommendedBracketForCount(room.members.length) : '2p';

  const handleSelectBracketTab = (bracket: PlayerBracket) => {
    setActiveBracket(bracket);
    if (isHost) {
      const firstInBracket = getLevelsByBracket(bracket)[0];
      if (firstInBracket) {
        onSelectStage(firstInBracket.index);
      }
    }
  };

  const handleCopyLink = () => {
    const url = lanInfo?.joinUrl || window.location.href;
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 p-3 sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="LAN Multiplayer Lobby"
        className="w-full max-w-2xl max-h-[92dvh] overflow-y-auto bg-white border-[3px] border-[#1A1A1A] shadow-[6px_6px_0_#1A1A1A] p-4 sm:p-6"
      >
        <div className="flex items-center justify-between gap-4 pb-3 border-b-2 border-neutral-200">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#1A1A1A]">
              LAN Multiplayer Room
            </h2>
            <p className="text-xs sm:text-sm text-neutral-600">
              Cross-platform PC &amp; Mobile sync via Node.js WebSocket
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (room) onLeaveRoom();
              onClose();
            }}
            aria-label="Close LAN Lobby"
            className="w-10 h-10 flex items-center justify-center border-2 border-[#1A1A1A] bg-white hover:bg-neutral-100 cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-3 px-3 py-2 bg-red-50 border-2 border-red-500 text-red-700 text-sm font-semibold"
          >
            {error}
          </div>
        )}

        {/* Player Identity Strip */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="pico-nickname"
              className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1"
            >
              Nickname
            </label>
            <input
              id="pico-nickname"
              type="text"
              maxLength={14}
              value={playerName}
              onChange={(e) => onChangeName(e.target.value)}
              placeholder="Cat Name"
              className="w-full h-11 px-3 border-2 border-[#1A1A1A] font-semibold text-sm bg-white focus:outline-none focus:border-[#F48C42]"
            />
          </div>

          <div>
            <span className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1">
              Cat Color
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {PLAYER_PALETTES.map((p) => {
                const selected = playerColor === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    aria-label={`Select ${p.name} color`}
                    onClick={() => onChangeColor(p.id)}
                    style={{ backgroundColor: p.fill }}
                    className={`w-8 h-8 border-2 cursor-pointer transition-transform ${
                      selected
                        ? 'border-[#1A1A1A] scale-110 shadow-[2px_2px_0_#1A1A1A]'
                        : 'border-neutral-400 hover:scale-105'
                    }`}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Create or Join Controls (when not in a room yet) */}
        {!room ? (
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t-2 border-neutral-200">
            <div className="flex flex-col justify-between p-4 bg-orange-50/60 border-2 border-[#1A1A1A]">
              <div>
                <h3 className="font-bold text-base text-[#1A1A1A]">Host New Room</h3>
                <p className="text-xs text-neutral-600 mt-1">
                  Create a room code and invite PC &amp; Mobile friends on the same Wi-Fi / LAN.
                </p>
              </div>
              <button
                type="button"
                onClick={onCreateRoom}
                className="mt-4 w-full h-11 bg-[#F48C42] hover:bg-[#E57B30] text-white font-bold border-2 border-[#1A1A1A] shadow-[3px_3px_0_#1A1A1A] cursor-pointer whitespace-nowrap"
              >
                Create LAN Room
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (joinCode.trim().length >= 3) {
                  onJoinRoom(joinCode.trim().toUpperCase());
                }
              }}
              className="flex flex-col justify-between p-4 bg-neutral-50 border-2 border-[#1A1A1A]"
            >
              <div>
                <label
                  htmlFor="room-code-input"
                  className="block font-bold text-base text-[#1A1A1A]"
                >
                  Join Existing Room
                </label>
                <input
                  id="room-code-input"
                  type="text"
                  maxLength={6}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="Enter 4-letter code (e.g. K9P2)"
                  className="mt-2 w-full h-11 px-3 border-2 border-[#1A1A1A] bg-white font-mono-tabular font-bold text-base uppercase tracking-widest focus:outline-none focus:border-[#F48C42]"
                />
              </div>
              <button
                type="submit"
                disabled={joinCode.trim().length < 3}
                className="mt-3 w-full h-11 bg-[#1A1A1A] hover:bg-neutral-800 disabled:opacity-40 text-white font-bold border-2 border-[#1A1A1A] cursor-pointer whitespace-nowrap"
              >
                Join Room
              </button>
            </form>
          </div>
        ) : (
          /* Inside Active Room */
          <div className="mt-5 pt-4 border-t-2 border-neutral-200 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 items-center p-4 bg-orange-50/60 border-2 border-[#1A1A1A]">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-neutral-600">
                  Room Code
                </div>
                <div className="text-3xl font-extrabold font-mono-tabular tracking-widest text-[#F48C42]">
                  {room.code}
                </div>
                {lanInfo && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <code className="text-xs font-mono-tabular bg-white px-2 py-1 border border-neutral-300 break-all">
                      {lanInfo.joinUrl}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-white border-2 border-[#1A1A1A] hover:bg-neutral-100 cursor-pointer whitespace-nowrap"
                    >
                      {copied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copied ? 'Copied' : 'Copy LAN URL'}</span>
                    </button>
                  </div>
                )}
                <p className="mt-1.5 text-xs text-neutral-600">
                  Scan QR on mobile or open the LAN URL on any phone/PC in the same Wi-Fi.
                </p>
              </div>

              {lanInfo?.qrDataUrl && (
                <div className="w-28 h-28 bg-white p-1.5 border-2 border-[#1A1A1A] shrink-0 mx-auto sm:mx-0">
                  <img
                    src={lanInfo.qrDataUrl}
                    alt="QR Code to join LAN room"
                    className="w-full h-full block object-contain"
                  />
                </div>
              )}
            </div>

            {/* Roster */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-600">
                  Players Connected ({room.members.length}/8)
                </span>
                <button
                  type="button"
                  onClick={onLeaveRoom}
                  className="text-xs font-bold text-red-600 hover:underline cursor-pointer"
                >
                  Leave Room
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {room.members.map((m) => {
                  const pal = PALETTE_BY_ID[m.color] ?? PALETTE_BY_ID.coral;
                  const isSelf = m.id === playerId;
                  return (
                    <div
                      key={m.id}
                      className={`flex items-center gap-2 p-2 border-2 ${
                        isSelf ? 'border-[#F48C42] bg-orange-50/40' : 'border-[#1A1A1A] bg-white'
                      }`}
                    >
                      <span
                        className="w-5 h-5 border-2 border-[#1A1A1A] shrink-0"
                        style={{ backgroundColor: pal.fill }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold truncate text-[#1A1A1A]">
                          {m.name} {m.isHost ? '★' : ''}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-neutral-500">
                          {m.deviceType === 'mobile' ? (
                            <Smartphone className="w-3 h-3" />
                          ) : (
                            <Laptop className="w-3 h-3" />
                          )}
                          <span>{m.deviceType === 'mobile' ? 'Mobile' : 'PC'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Player-Count Balanced Mode & Stage Selector */}
            <div className="pt-3 border-t-2 border-neutral-200 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-600">
                  Mode Khusus Jumlah Pemain
                </span>
                {isHost && (
                  <button
                    type="button"
                    onClick={() => handleSelectBracketTab(recommendedBracket)}
                    className="text-xs font-bold text-[#F48C42] hover:underline cursor-pointer"
                  >
                    Auto-match ({room.members.length}P → {recommendedBracket.toUpperCase()})
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                {BRACKET_TABS.map((tab) => {
                  const isActive = activeBracket === tab.id;
                  const isRec = recommendedBracket === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => handleSelectBracketTab(tab.id)}
                      className={`px-2 py-2 text-left border-2 cursor-pointer transition-colors ${
                        isActive
                          ? 'bg-orange-50 border-[#F48C42]'
                          : 'bg-white border-neutral-300 hover:border-[#1A1A1A]'
                      }`}
                    >
                      <div className="text-xs font-extrabold text-[#1A1A1A] whitespace-nowrap">
                        {tab.label} {isRec ? '· Fit' : ''}
                      </div>
                      <div className="text-[11px] text-neutral-600 truncate">{tab.desc}</div>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="grid grid-cols-5 sm:grid-cols-10 gap-1 max-h-36 overflow-y-auto pr-1">
                    {bracketStages.map((lvl) => (
                      <button
                        key={lvl.index}
                        type="button"
                        disabled={!isHost}
                        onClick={() => onSelectStage(lvl.index)}
                        aria-label={`${activeBracket.toUpperCase()} Stage ${lvl.stageNumber}: ${lvl.name}`}
                        className={`h-8 font-mono-tabular font-bold text-xs border-2 cursor-pointer disabled:cursor-default whitespace-nowrap ${
                          room.stageIndex === lvl.index
                            ? 'bg-[#F48C42] text-white border-[#1A1A1A]'
                            : 'bg-white text-[#1A1A1A] border-neutral-300 hover:border-[#1A1A1A]'
                        }`}
                      >
                        {String(lvl.stageNumber).padStart(2, '0')}
                      </button>
                    ))}
                  </div>
                  <div className="text-xs text-neutral-600 truncate">
                    <strong className="text-[#1A1A1A]">
                      {currentStage.bracket.toUpperCase()} Stage {currentStage.stageNumber}/40 ·{' '}
                      {currentStage.name}
                    </strong>{' '}
                    · {currentStage.hint}
                  </div>
                </div>

                {isHost ? (
                  <button
                    type="button"
                    onClick={onStartGame}
                    className="inline-flex items-center justify-center gap-2 px-6 h-11 bg-[#F48C42] hover:bg-[#E57B30] text-white font-bold border-2 border-[#1A1A1A] shadow-[3px_3px_0_#1A1A1A] cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Start Mabar</span>
                  </button>
                ) : (
                  <div className="text-sm font-semibold text-neutral-600 px-3 py-2 bg-neutral-100 border border-neutral-300 text-center shrink-0">
                    Waiting for Host...
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Collapsible Laragon & LAN Guide */}
        <div className="mt-4 pt-3 border-t border-neutral-200">
          <button
            type="button"
            onClick={() => setShowGuide((v) => !v)}
            className="w-full flex items-center justify-between text-xs font-bold text-neutral-700 hover:text-[#1A1A1A] py-1 cursor-pointer"
          >
            <span>Laragon &amp; Local LAN Setup Guide (PC + HP Mabar)</span>
            {showGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showGuide && (
            <div className="mt-2 p-3 bg-neutral-50 border border-neutral-300 text-xs text-neutral-700 space-y-1.5 leading-relaxed">
              <p>
                <strong>1. Jalankan di Terminal Laragon:</strong> Masuk ke folder project (
                <code>cd D:\laragon\www\pico-park</code>), jalankan{' '}
                <code>npm install --legacy-peer-deps</code> lalu <code>npm run dev</code>.
              </p>
              <p>
                <strong>2. Wi-Fi / Hotspot Sama:</strong> Hubungkan semua PC dan HP ke Wi-Fi atau
                hotspot yang sama. Izinkan port <code>3000</code> jika Windows Firewall bertanya.
              </p>
              <p>
                <strong>3. Pilih Mode Pemain:</strong> Gunakan tab <strong>2 Player</strong> sampai{' '}
                <strong>6+ Player</strong> — masing-masing punya 40 stage dengan rintangan bertingkat
                yang seimbang sesuai jumlah pemain (total 200 stage).
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
