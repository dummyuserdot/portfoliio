"use client";

/**
 * AvatarScrollAnimation — Premium 3D Zohaib Character Experience
 * ==============================================================
 * Represents Zohaib Ali Dayo (DotZohaib) — AI Engineer & Full Stack Developer
 * 
 * Features:
 * - 5 Custom Pixar-grade 3D character poses with transparent AI-segmented alpha
 * - Dynamic scroll section detection & pose reaction
 * - Real-time 3D perspective mouse tracking & drag turntable
 * - Orbiting 3D floating tech badges (Python, React, Next.js, LangChain, PyTorch, GenAI)
 * - Interactive Smart Dialogue Speech Bubble (Section-reactive & click-to-speak)
 * - 3D Model Studio Control Dock (Pose switcher presets & audio feedback)
 * - Web Audio API synthesized futuristic sci-fi sound effects (with mute toggle)
 * - Floating particle hearts & energy sparks
 * - Holographic cyber pedestal & dynamic cast ground shadow
 * - Mobile responsive & collapsible
 */

import React, { useEffect, useRef, useState, useCallback } from "react";

type Pose = "idle" | "wave" | "point" | "heart" | "thankyou";

const POSE_ASSETS: Record<Pose, { src: string; label: string; icon: string }> = {
  wave:     { src: "/avatar_wave.png",     label: "Wave",     icon: "👋" },
  idle:     { src: "/avatar_idle.png",     label: "Idle",     icon: "⚡" },
  point:    { src: "/avatar_point.png",    label: "Point",    icon: "🎯" },
  heart:    { src: "/avatar_heart.png",    label: "Heart",    icon: "❤️" },
  thankyou: { src: "/avatar_thankyou.png", label: "Thanks",   icon: "🙏" },
};

const SECTIONS = ["home", "about", "skills", "experience", "projects", "certifications", "education", "contact"];

const SECTION_DATA: Record<string, { pose: Pose; speech: string }> = {
  home: {
    pose: "wave",
    speech: "Hi there! I'm Zohaib Ali Dayo 👋 AI & Full Stack Engineer. Welcome to my portfolio!",
  },
  about: {
    pose: "idle",
    speech: "Passionate about GenAI, Deep Learning & scalable architectures!",
  },
  skills: {
    pose: "point",
    speech: "Here are my core tools: Python, LangChain, Next.js & Cloud AI ⚡",
  },
  experience: {
    pose: "idle",
    speech: "Check out my journey delivering production-ready AI solutions 💼",
  },
  projects: {
    pose: "point",
    speech: "Explore my real-world AI applications, RAG systems & full-stack apps 🚀",
  },
  certifications: {
    pose: "idle",
    speech: "Continuously learning & validating industry credentials 📜",
  },
  education: {
    pose: "idle",
    speech: "Proud alumni of SMIU & Governor Sindh AI Initiative 🎓",
  },
  contact: {
    pose: "thankyou",
    speech: "Let's build something extraordinary together! Drop me a message ❤️",
  },
};

const TECH_BADGES = [
  { name: "Python",    color: "#38bdf8", angle: 0,   distance: 105, speed: 0.8 },
  { name: "LangChain", color: "#34d399", angle: 60,  distance: 120, speed: 0.7 },
  { name: "Next.js",   color: "#f8fafc", angle: 120, distance: 95,  speed: 0.9 },
  { name: "PyTorch",   color: "#f97316", angle: 180, distance: 115, speed: 0.65 },
  { name: "React",     color: "#60a5fa", angle: 240, distance: 100, speed: 0.85 },
  { name: "GenAI",     color: "#a855f7", angle: 300, distance: 110, speed: 0.75 },
];

const EASTER_EGGS = [
  "Looking for custom AI Agents or RAG pipelines? Let's talk! 🤖",
  "I turn complex data into production-ready intelligence 💡",
  "Next.js + Python FastAPI is my powerhouse combination 🚀",
  "Don't hesitate to download my CV or send me an email! 📄",
  "Always experimenting with the latest LLMs & multimodal models 🧠",
];

// Web Audio API sound synthesizer
class SoundSynth {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private init() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
  }

  playPop() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === "suspended") this.ctx.resume();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.09);
    } catch {
      // Audio not permitted without interaction
    }
  }

  playChime() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === "suspended") this.ctx.resume();
      const now = this.ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);
        gain.gain.setValueAtTime(0.05, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.22);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.24);
      });
    } catch {
      // Audio not permitted
    }
  }
}

const synth = new SoundSynth();

export default function AvatarScrollAnimation() {
  const [pose, setPose] = useState<Pose>("wave");
  const [prevPose, setPrevPose] = useState<Pose>("wave");
  const [transitioning, setTransitioning] = useState<boolean>(false);
  const [speech, setSpeech] = useState<string>(SECTION_DATA.home.speech);
  const [showSpeech, setShowSpeech] = useState<boolean>(true);
  const [minimized, setMinimized] = useState<boolean>(false);
  const [soundOn, setSoundOn] = useState<boolean>(false);
  const [hearts, setHearts] = useState<{ id: number; x: number; y: number; size: number }[]>([]);
  const [clickBounce, setClickBounce] = useState<boolean>(false);

  // 3D rotation state
  const mouseRef = useRef({ x: 0, y: 0 });
  const rotRef = useRef({ rx: 0, ry: 0 });
  const dragRef = useRef({ dragging: false, startX: 0, currentRy: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const avatarCardRef = useRef<HTMLDivElement>(null);
  const lastSectionRef = useRef<string>("");
  const poseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Synchronize sound toggle with synth
  useEffect(() => {
    synth.enabled = soundOn;
  }, [soundOn]);

  // Pose transition helper
  const handlePoseChange = useCallback((next: Pose, customSpeech?: string, playAudio: boolean = true) => {
    if (next === pose && !customSpeech) return;
    setPrevPose(pose);
    setTransitioning(true);
    if (playAudio) synth.playPop();

    setTimeout(() => {
      setPose(next);
      setTransitioning(false);
    }, 250);

    if (customSpeech) {
      setSpeech(customSpeech);
      setShowSpeech(true);
      if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
      speechTimeoutRef.current = setTimeout(() => setShowSpeech(false), 8000);
    }
  }, [pose]);

  // Section observer on scroll
  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY + window.innerHeight * 0.38;
      let currentSec = "home";

      for (const id of SECTIONS) {
        const el = document.getElementById(id);
        if (el) {
          const top = el.offsetTop;
          if (top <= scrollPos) currentSec = id;
        }
      }

      if (currentSec !== lastSectionRef.current) {
        lastSectionRef.current = currentSec;
        const config = SECTION_DATA[currentSec] ?? SECTION_DATA.home;
        handlePoseChange(config.pose, config.speech, false);

        if (currentSec === "contact") {
          triggerHeartBurst();
        }

        if (config.pose !== "idle") {
          if (poseTimeoutRef.current) clearTimeout(poseTimeoutRef.current);
          poseTimeoutRef.current = setTimeout(() => {
            handlePoseChange("idle", undefined, false);
          }, currentSec === "home" ? 7000 : 4500);
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handlePoseChange]);

  // 3D Mouse Parallax & Gyro tracking
  useEffect(() => {
    let rafId: number;

    const onMouseMove = (e: MouseEvent) => {
      if (dragRef.current.dragging) return;
      // Normalized between -1 and 1
      mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };

    const update3D = () => {
      if (!dragRef.current.dragging) {
        const targetRy = mouseRef.current.x * 16;
        const targetRx = -mouseRef.current.y * 10;
        rotRef.current.ry += (targetRy - rotRef.current.ry) * 0.08;
        rotRef.current.rx += (targetRx - rotRef.current.rx) * 0.08;
      }

      if (avatarCardRef.current) {
        avatarCardRef.current.style.transform = `rotateX(${rotRef.current.rx}deg) rotateY(${rotRef.current.ry}deg)`;
      }

      rafId = requestAnimationFrame(update3D);
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    rafId = requestAnimationFrame(update3D);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  // Heart particle trigger
  const triggerHeartBurst = () => {
    const burst = Array.from({ length: 9 }, (_, i) => ({
      id: Date.now() + i,
      x: 35 + (Math.random() - 0.5) * 45,
      y: 35 + (Math.random() - 0.5) * 35,
      size: 16 + Math.random() * 16,
    }));
    setHearts(burst);
    setTimeout(() => setHearts([]), 3500);
  };

  // Avatar Click Interaction
  const handleAvatarClick = () => {
    synth.playChime();
    setClickBounce(true);
    setTimeout(() => setClickBounce(false), 600);

    const randomEgg = EASTER_EGGS[Math.floor(Math.random() * EASTER_EGGS.length)];
    setSpeech(randomEgg);
    setShowSpeech(true);

    triggerHeartBurst();

    if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
    speechTimeoutRef.current = setTimeout(() => setShowSpeech(false), 7000);
  };

  // Mouse Drag to Rotate Turntable
  const handleMouseDown = (e: React.MouseEvent) => {
    dragRef.current.dragging = true;
    dragRef.current.startX = e.clientX;
    dragRef.current.currentRy = rotRef.current.ry;

    const onDragMove = (ev: MouseEvent) => {
      if (!dragRef.current.dragging) return;
      const delta = ev.clientX - dragRef.current.startX;
      rotRef.current.ry = dragRef.current.currentRy + delta * 0.35;
    };

    const onDragEnd = () => {
      dragRef.current.dragging = false;
      window.removeEventListener("mousemove", onDragMove);
      window.removeEventListener("mouseup", onDragEnd);
    };

    window.addEventListener("mousemove", onDragMove);
    window.addEventListener("mouseup", onDragEnd);
  };

  return (
    <>
      <style>{`
        @keyframes avatarBreathe {
          0%, 100% { transform: translateY(0px) scale(1); }
          50%      { transform: translateY(-8px) scale(1.012); }
        }
        @keyframes avatarEntrance {
          0%   { opacity: 0; transform: translateY(80px) scale(0.85); filter: blur(6px); }
          100% { opacity: 1; transform: translateY(0px) scale(1); filter: blur(0px); }
        }
        @keyframes cyberPedestalPulse {
          0%, 100% {
            transform: scale(1) rotateX(75deg);
            box-shadow: 0 0 25px rgba(56, 189, 248, 0.45), inset 0 0 15px rgba(168, 85, 247, 0.45);
          }
          50% {
            transform: scale(1.08) rotateX(75deg);
            box-shadow: 0 0 45px rgba(56, 189, 248, 0.75), inset 0 0 25px rgba(168, 85, 247, 0.75);
          }
        }
        @keyframes shadowBreath {
          0%, 100% { transform: scale(1); opacity: 0.35; }
          50%      { transform: scale(0.88); opacity: 0.2; }
        }
        @keyframes techOrbit {
          0%   { transform: rotate(0deg) translateX(var(--orbit-dist)) rotate(0deg); }
          100% { transform: rotate(360deg) translateX(var(--orbit-dist)) rotate(-360deg); }
        }
        @keyframes heartFly {
          0%   { opacity: 1; transform: translateY(0) scale(0.6) rotate(0deg); }
          50%  { opacity: 0.9; transform: translateY(-60px) scale(1.15) rotate(15deg); }
          100% { opacity: 0; transform: translateY(-130px) scale(0.4) rotate(-15deg); }
        }
        @keyframes speechPop {
          0%   { opacity: 0; transform: scale(0.8) translateY(12px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .avatar-pose-active {
          animation: avatarPoseEnter 0.35s cubic-bezier(0.34, 1.4, 0.64, 1) both;
        }
        @keyframes avatarPoseEnter {
          from { opacity: 0; transform: scale(0.95) translateY(6px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        .avatar-pose-prev {
          animation: avatarPoseExit 0.25s ease both;
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
        }
        @keyframes avatarPoseExit {
          from { opacity: 1; transform: scale(1); }
          to   { opacity: 0; transform: scale(0.97) translateY(4px); }
        }
      `}</style>

      {/* Main fixed 3D container */}
      <aside
        aria-label="3D Avatar Interactive Character"
        className="fixed bottom-0 right-1 z-40 select-none print:hidden sm:right-4"
        style={{
          width: minimized ? "70px" : "clamp(200px, 20vw, 300px)",
          height: minimized ? "70px" : "clamp(340px, 48vh, 520px)",
          transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1), height 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
          pointerEvents: "auto",
        }}
      >
        {/* Minimized Bubble Toggle */}
        {minimized ? (
          <button
            onClick={() => setMinimized(false)}
            title="Expand 3D Zohaib Character"
            className="group relative flex h-16 w-16 items-center justify-center rounded-full border border-sky-400/40 bg-slate-900/90 shadow-[0_0_25px_rgba(56,189,248,0.4)] backdrop-blur-md transition-all hover:scale-110 hover:border-sky-400 active:scale-95"
          >
            <img
              src="/avatar_wave.png"
              alt="Expand 3D Avatar"
              className="h-12 w-12 object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
            />
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
              <span className="relative inline-flex h-4 w-4 rounded-full bg-sky-500" />
            </span>
          </button>
        ) : (
          <div className="relative flex h-full w-full flex-col justify-end" ref={containerRef}>
            {/* Top Toolbar: Minimize & Sound toggle */}
            <div className="absolute top-0 right-2 z-50 flex items-center gap-1.5 rounded-full border border-slate-700/60 bg-slate-900/80 p-1 backdrop-blur-md shadow-lg">
              <button
                onClick={() => {
                  setSoundOn(!soundOn);
                  if (!soundOn) synth.playPop();
                }}
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs transition-colors ${
                  soundOn ? "bg-sky-500/20 text-sky-300" : "text-slate-400 hover:text-white"
                }`}
                title={soundOn ? "Mute sounds" : "Enable sci-fi sounds"}
              >
                {soundOn ? "🔊" : "🔇"}
              </button>
              <button
                onClick={() => setMinimized(true)}
                className="flex h-6 w-6 items-center justify-center rounded-full text-xs text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                title="Minimize avatar"
              >
                ✕
              </button>
            </div>

            {/* Smart Dialogue Speech Bubble */}
            {showSpeech && (
              <div
                style={{ animation: "speechPop 0.35s cubic-bezier(0.34, 1.4, 0.64, 1) both" }}
                className="relative mb-2 ml-auto max-w-[240px] rounded-2xl border border-sky-400/30 bg-slate-950/90 p-3 shadow-[0_8px_30px_rgba(0,0,0,0.5)] backdrop-blur-md"
              >
                <div className="flex items-start gap-2">
                  <div className="text-xs text-slate-200 leading-relaxed font-medium">
                    {speech}
                  </div>
                  <button
                    onClick={() => setShowSpeech(false)}
                    className="text-slate-400 hover:text-white text-xs shrink-0"
                    title="Dismiss"
                  >
                    ×
                  </button>
                </div>
                {/* Speech tail */}
                <div className="absolute -bottom-1.5 right-12 h-3 w-3 rotate-45 border-r border-b border-sky-400/30 bg-slate-950/90" />
              </div>
            )}

            {/* 3D Character Stage */}
            <div
              className="relative flex h-[78%] w-full items-end justify-center"
              style={{ perspective: "1000px" }}
              onMouseDown={handleMouseDown}
            >
              {/* Floating Hearts */}
              {hearts.map((h) => (
                <div
                  key={h.id}
                  style={{
                    position: "absolute",
                    left: `${h.x}%`,
                    top: `${h.y}%`,
                    fontSize: `${h.size}px`,
                    animation: "heartFly 2.2s ease-out forwards",
                    zIndex: 35,
                    filter: "drop-shadow(0 0 8px rgba(244,63,94,0.85))",
                    pointerEvents: "none",
                  }}
                >
                  ❤️
                </div>
              ))}

              {/* Orbiting 3D Tech Badges */}
              <div
                className="pointer-events-none absolute inset-0 flex items-center justify-center"
                style={{ transformStyle: "preserve-3d" }}
              >
                {TECH_BADGES.map((badge, idx) => (
                  <div
                    key={badge.name}
                    className="absolute flex items-center justify-center rounded-full border border-slate-700/60 bg-slate-950/80 px-2 py-0.5 text-[10px] font-semibold shadow-[0_0_12px_rgba(0,0,0,0.4)] backdrop-blur-sm"
                    style={{
                      color: badge.color,
                      borderColor: `${badge.color}40`,
                      boxShadow: `0 0 10px ${badge.color}25`,
                      transform: `rotate(${badge.angle + idx * 25}deg) translateX(${badge.distance}px) rotate(-${badge.angle + idx * 25}deg)`,
                      animation: `techOrbit ${12 / badge.speed}s linear infinite`,
                      willChange: "transform",
                    }}
                  >
                    {badge.name}
                  </div>
                ))}
              </div>

              {/* 3D Avatar Card with Parallax & Tilt */}
              <div
                ref={avatarCardRef}
                onClick={handleAvatarClick}
                className="group relative flex h-full w-full cursor-pointer flex-col items-center justify-end"
                style={{
                  transformStyle: "preserve-3d",
                  transition: "transform 0.08s ease-out",
                  animation: `avatarBreathe 4s ease-in-out infinite, avatarEntrance 1s cubic-bezier(0.34, 1.4, 0.64, 1) both`,
                }}
                title="Click to interact with Zohaib!"
              >
                {/* Character Images (Cross-fading) */}
                <div
                  className={`relative h-full w-full flex items-end justify-center transition-transform duration-300 ${
                    clickBounce ? "scale-105 -translate-y-3" : ""
                  }`}
                  style={{ transformStyle: "preserve-3d" }}
                >
                  {/* Previous pose fading out */}
                  {transitioning && (
                    <img
                      src={POSE_ASSETS[prevPose].src}
                      alt=""
                      className="avatar-pose-prev h-full w-full object-contain object-bottom pointer-events-none"
                      draggable={false}
                    />
                  )}

                  {/* Current pose */}
                  <img
                    src={POSE_ASSETS[pose].src}
                    alt="Zohaib Ali Dayo — 3D Avatar Character"
                    key={pose}
                    className="avatar-pose-active h-full w-full object-contain object-bottom pointer-events-none drop-shadow-[0_15px_30px_rgba(0,0,0,0.65)] drop-shadow-[0_0_20px_rgba(56,189,248,0.2)]"
                    draggable={false}
                  />
                </div>

                {/* Ground Shadow */}
                <div
                  className="pointer-events-none absolute -bottom-1 h-3.5 w-3/5 rounded-[100%] bg-black/60 blur-[3px]"
                  style={{ animation: "shadowBreath 4s ease-in-out infinite" }}
                />

                {/* Cyber Holographic Ring Pedestal */}
                <div
                  className="pointer-events-none absolute -bottom-3 h-14 w-4/5 rounded-full border border-sky-400/40 bg-gradient-to-r from-sky-500/10 via-purple-500/15 to-sky-500/10"
                  style={{ animation: "cyberPedestalPulse 3.5s ease-in-out infinite" }}
                />
              </div>
            </div>

            {/* 3D Model Studio Control Dock (Pose switcher presets) */}
            <div className="relative mt-2 flex items-center justify-center gap-1 rounded-2xl border border-slate-800/80 bg-slate-950/85 p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.6)] backdrop-blur-md">
              {(Object.keys(POSE_ASSETS) as Pose[]).map((pKey) => {
                const item = POSE_ASSETS[pKey];
                const isActive = pose === pKey;
                return (
                  <button
                    key={pKey}
                    onClick={() => handlePoseChange(pKey, undefined, true)}
                    title={`Switch pose to ${item.label}`}
                    className={`flex items-center gap-1 rounded-xl px-2 py-1 text-[11px] font-medium transition-all ${
                      isActive
                        ? "bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-[0_0_12px_rgba(56,189,248,0.5)] scale-105"
                        : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 active:scale-95"
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span className="hidden sm:inline">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
