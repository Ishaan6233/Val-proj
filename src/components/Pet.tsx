import { useEffect, useRef, useState } from "react";
import "./Pet.css";

type State = "idle" | "walking" | "running" | "playing" | "sleeping" | "eating";

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export default function Pet({
  type = "bunny",
  hidden = false,
}: {
  type?: "bunny" | "cat";
  hidden?: boolean;
}) {
  if (hidden) return null;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState({ x: 80, y: 80 });
  const [isFollowing, setIsFollowing] = useState(true);
  const followRef = useRef(true);

  // initialize to bottom-left once mounted (avoids window usage during SSR/build)
  useEffect(() => {
    const startY = window.innerHeight - 140;
    setPos({ x: 80, y: startY });
    targetRef.current = { x: 80, y: startY };
  }, []);
  const targetRef = useRef({ x: pos.x, y: pos.y });
  const velocityRef = useRef({ vx: 0, vy: 0 });
  const lastMoveAt = useRef<number>(Date.now());
  const [state, setState] = useState<State>("idle");
  const [facing, setFacing] = useState<"left" | "right">("right");
  const rafRef = useRef<number | null>(null);
  const playTimerRef = useRef<number | null>(null);

  useEffect(() => {
    followRef.current = isFollowing;
  }, [isFollowing]);

  useEffect(() => {
    function onMove(e: MouseEvent | TouchEvent) {
      if (!followRef.current) return;
      lastMoveAt.current = Date.now();
      let clientX = 0;
      let clientY = 0;
      if (e instanceof TouchEvent) {
        const t = e.touches[0] || e.changedTouches[0];
        if (!t) return;
        clientX = t.clientX;
        clientY = t.clientY;
      } else {
        const me = e as MouseEvent;
        clientX = me.clientX;
        clientY = me.clientY;
      }
      // we want pet to walk near cursor but slightly offset to look natural
      const x = clamp(clientX - 48, 24, window.innerWidth - 120);
      const y = clamp(clientY - 20, 80, window.innerHeight - 40);
      targetRef.current = { x, y };
    }

    function onClick(e: MouseEvent) {
      const isInside = (id: string) => {
        const el = document.getElementById(id);
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        return (
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom
        );
      };

      const moveToAnchor = (id: string) => {
        const el = document.getElementById(id);
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const x = clamp(
          rect.left + rect.width / 2 - 60,
          24,
          window.innerWidth - 120,
        );
        const y = clamp(
          rect.top + rect.height / 2 - 40,
          80,
          window.innerHeight - 40,
        );
        targetRef.current = { x, y };
      };

      // If clicked on pet, trigger play
      const pet = containerRef.current?.getBoundingClientRect();
      if (!pet) return;
      if (
        e.clientX >= pet.left &&
        e.clientX <= pet.right &&
        e.clientY >= pet.top &&
        e.clientY <= pet.bottom
      ) {
        setState("playing");
        if (playTimerRef.current) window.clearTimeout(playTimerRef.current);
        playTimerRef.current = window.setTimeout(() => {
          setState("idle");
        }, 3000);
        return;
      }

      if (isInside("cat-house")) {
        if (followRef.current) {
          setIsFollowing(false);
          moveToAnchor("cat-house");
          setState("idle");
        } else {
          setIsFollowing(true);
          setState("idle");
          lastMoveAt.current = Date.now();
          const x = clamp(e.clientX - 48, 24, window.innerWidth - 120);
          const y = clamp(e.clientY - 20, 80, window.innerHeight - 40);
          targetRef.current = { x, y };
        }
        return;
      }

      if (isInside("cat-bowl")) {
        setIsFollowing(false);
        moveToAnchor("cat-bowl");
        setState("eating");
        return;
      }
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchstart", onMove, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("click", onClick);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchstart", onMove);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("click", onClick);
    };
  }, []);

  useEffect(() => {
    function loop() {
      const tx = targetRef.current.x;
      const ty = targetRef.current.y;
      const dx = tx - pos.x;
      const dy = ty - pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // easing movement
      const speed = clamp(dist * 0.08, 0, 14); // pixels per frame-ish
      const angle = Math.atan2(dy, dx);
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      velocityRef.current = { vx, vy };
      const nx = pos.x + vx;
      const ny = pos.y + vy;

      setPos({ x: nx, y: ny });

      // facing
      if (vx < -0.5) setFacing("left");
      else if (vx > 0.5) setFacing("right");

      // states
      const nowMs = Date.now();
      const idleTime = nowMs - lastMoveAt.current;
      if (state !== "playing" && state !== "eating") {
        if (idleTime > 6000) {
          setState("sleeping");
        } else if (dist < 4) {
          setState("idle");
        } else if (speed > 8) {
          setState("running");
        } else {
          setState("walking");
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [pos.x, pos.y, state]);

  // When sleeping, slowly bob and show z's
  // Render a simple SVG bunny with CSS classes to animate legs/ears/eyes

  return (
    <div
      ref={containerRef}
      className={`pet ${state} ${facing}`}
      style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
      aria-hidden
    >
      <div className="bubble">
        {state === "sleeping" ? <span>💤</span> : null}
      </div>
      {state === "eating" ? <div className="food-bowl" aria-hidden /> : null}

      {/* Render either a bunny or a cat SVG based on `type` prop */}
      {type === "bunny" ? (
        <svg
          viewBox="0 0 120 80"
          className="pet-svg"
          width="120"
          height="80"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g className="bunny-body" transform="translate(10,10)">
            <ellipse className="body" cx="40" cy="30" rx="30" ry="18" />
            <ellipse className="tail" cx="8" cy="36" rx="6" ry="6" />
            <g className="head" transform="translate(62,-2)">
              <ellipse className="face" cx="14" cy="18" rx="14" ry="14" />
              <g className="ears">
                <ellipse className="ear left" cx="6" cy="-6" rx="6" ry="14" />
                <ellipse className="ear right" cx="22" cy="-6" rx="6" ry="14" />
              </g>
              <g className="eyes">
                <circle className="eye left" cx="10" cy="16" r="2.2" />
                <circle className="eye right" cx="18" cy="16" r="2.2" />
              </g>
              <ellipse className="nose" cx="14" cy="22" rx="2.2" ry="1.6" />
            </g>
            <g className="legs">
              <rect
                className="leg back"
                x="18"
                y="38"
                rx="3"
                ry="3"
                width="8"
                height="10"
              />
              <rect
                className="leg front"
                x="34"
                y="38"
                rx="3"
                ry="3"
                width="8"
                height="10"
              />
            </g>
          </g>
        </svg>
      ) : (
        <svg
          viewBox="0 0 120 80"
          className="pet-svg"
          width="120"
          height="80"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g className="cat-body" transform="translate(10,6)">
            <ellipse className="body" cx="42" cy="34" rx="28" ry="16" />
            <g className="head" transform="translate(62,-2)">
              <ellipse className="face" cx="14" cy="18" rx="12" ry="12" />
              <g className="ears">
                <polygon className="ear left" points="6,-6 12,-18 16,-6" />
                <polygon className="ear right" points="22,-6 26,-18 30,-6" />
              </g>
              <g className="eyes">
                <circle className="eye left" cx="10" cy="16" r="2.2" />
                <circle className="eye right" cx="18" cy="16" r="2.2" />
              </g>
              <ellipse className="nose" cx="14" cy="22" rx="2" ry="1.4" />
              <g className="whiskers" stroke="#2b2b2b" strokeWidth="1">
                <line x1="0" y1="22" x2="-10" y2="20" />
                <line x1="0" y1="26" x2="-10" y2="26" />
                <line x1="28" y1="22" x2="38" y2="20" />
                <line x1="28" y1="26" x2="38" y2="26" />
              </g>
            </g>
            <g className="tail" transform="translate(6,10)">
              <path
                d="M48 24 C 54 14, 70 10, 78 22"
                stroke="#e3cdb6"
                strokeWidth="4"
                fill="none"
                strokeLinecap="round"
              />
            </g>
          </g>
        </svg>
      )}
    </div>
  );
}
