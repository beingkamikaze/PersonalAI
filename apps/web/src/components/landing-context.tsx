"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentType,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import {
  ChatIcon,
  KnowledgeIcon,
  MemoryIcon,
  SettingsIcon,
  ShieldIcon,
  SlidersIcon,
} from "@/components/ui/icons";

const EASE = [0.22, 1, 0.36, 1] as const;

type IconComponent = ComponentType<{ className?: string }>;

type ContextItem = {
  title: string;
  body: string;
  example: string;
  icon: IconComponent;
  tone: string;
  place: string;
  depth: number;
  tilt: number;
  rx: number;
  ry: number;
  enter: { x: number; y: number; rotate: number };
  bend: number;
};

const CONTEXTS: ContextItem[] = [
  {
    title: "Knowledge",
    body: "Documents, notes, and links it can answer from.",
    example: "Resume.pdf · Project notes · Your website",
    icon: KnowledgeIcon,
    tone: "bg-[var(--tone-sky)] text-[#2563eb]",
    place:
      "md:absolute md:left-[54%] md:top-0 md:w-[13.25rem] md:-translate-x-1/2 lg:left-[53%] lg:w-[16.75rem] xl:w-[18.25rem]",
    depth: 9,
    tilt: -0.8,
    rx: 2.2,
    ry: 0.4,
    enter: { x: 6, y: -18, rotate: -1.4 },
    bend: 14,
  },
  {
    title: "Memory",
    body: "Facts and project details you want remembered.",
    example: "Led the client workshop series in 2024",
    icon: MemoryIcon,
    tone: "bg-accent-soft text-accent",
    place:
      "md:absolute md:left-0 md:top-[14%] md:w-[13.25rem] lg:top-[13%] lg:w-[16.75rem] xl:w-[18.25rem]",
    depth: 14,
    tilt: 1.1,
    rx: 1.2,
    ry: 2.4,
    enter: { x: -22, y: -8, rotate: -1.8 },
    bend: -12,
  },
  {
    title: "Preferences",
    body: "How you like to work and communicate.",
    example: "Async first. Short written updates.",
    icon: SlidersIcon,
    tone: "bg-[var(--tone-mint)] text-accent",
    place:
      "md:absolute md:right-0 md:top-[18%] md:w-[13.25rem] lg:top-[17%] lg:w-[16.75rem] xl:w-[18.25rem]",
    depth: 11,
    tilt: -0.7,
    rx: 1.6,
    ry: -2.2,
    enter: { x: 20, y: -6, rotate: 1.5 },
    bend: 12,
  },
  {
    title: "Boundaries",
    body: "What it should never invent or share.",
    example: "Do not invent fees or private contacts.",
    icon: ShieldIcon,
    tone: "bg-[var(--tone-purple)] text-[var(--tone-purple-ink)]",
    place:
      "md:absolute md:left-0 md:top-[60%] md:w-[13.25rem] lg:top-[58%] lg:w-[16.75rem] xl:w-[18.25rem]",
    depth: 13,
    tilt: -1.15,
    rx: -1,
    ry: 2.2,
    enter: { x: -18, y: 12, rotate: -1.2 },
    bend: -14,
  },
  {
    title: "Personality",
    body: "Tone: formal or warm, brief or detailed.",
    example: "Clear, warm, and concise",
    icon: SettingsIcon,
    tone: "bg-[#fff7e6] text-[var(--tone-amber)]",
    place:
      "md:absolute md:right-0 md:top-[63%] md:w-[13.25rem] lg:top-[61%] lg:w-[16.75rem] xl:w-[18.25rem]",
    depth: 10,
    tilt: 0.9,
    rx: 0.8,
    ry: -2.4,
    enter: { x: 18, y: 10, rotate: 1.6 },
    bend: 10,
  },
  {
    title: "Conversations",
    body: "Private chats where you check answers and save what matters.",
    example: "How do you start a project? — saved to memory",
    icon: ChatIcon,
    tone: "bg-[var(--tone-sky)] text-[#2563eb]",
    place:
      "md:absolute md:bottom-0 md:left-[46%] md:w-[13.25rem] md:-translate-x-1/2 lg:left-[45%] lg:w-[16.75rem] xl:w-[18.25rem]",
    depth: 12,
    tilt: 0.6,
    rx: -2,
    ry: -0.3,
    enter: { x: -4, y: 18, rotate: 1.1 },
    bend: -11,
  },
];

const CARD_ORDER = [
  "order-2",
  "order-3",
  "order-4",
  "order-5",
  "order-6",
  "order-7",
] as const;

const REST_SHADOW =
  "shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_1px_2px_rgba(18,40,32,0.04),0_14px_30px_-20px_rgba(18,40,32,0.42)]";

const RAISED_SHADOW =
  "shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_2px_4px_rgba(18,40,32,0.05),0_20px_36px_-18px_rgba(18,40,32,0.4),0_12px_28px_-20px_rgba(12,107,86,0.28)]";

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    const apply = () => setMatches(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [query]);

  return matches;
}

type Box = { x: number; y: number; w: number; h: number };

function boxInStage(el: HTMLElement, stage: HTMLElement): Box {
  const stageBox = stage.getBoundingClientRect();
  const rect = el.getBoundingClientRect();
  return {
    x: rect.left - stageBox.left,
    y: rect.top - stageBox.top,
    w: rect.width,
    h: rect.height,
  };
}

function borderPoint(rect: Box, towardX: number, towardY: number, gap: number) {
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  const dx = towardX - cx;
  const dy = towardY - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const halfW = rect.w / 2 + gap;
  const halfH = rect.h / 2 + gap;
  const t = 1 / Math.max(Math.abs(dx) / halfW, Math.abs(dy) / halfH);
  return { x: cx + dx * t, y: cy + dy * t };
}

function connectorPath(from: Box, to: Box, bend: number) {
  const fromCenter = { x: from.x + from.w / 2, y: from.y + from.h / 2 };
  const toCenter = { x: to.x + to.w / 2, y: to.y + to.h / 2 };
  const start = borderPoint(from, toCenter.x, toCenter.y, 12);
  const end = borderPoint(to, fromCenter.x, fromCenter.y, 16);
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.hypot(dx, dy) || 1;
  const curve = Math.min(Math.abs(bend), len * 0.12) * Math.sign(bend);
  const mx = (start.x + end.x) / 2 + (-dy / len) * curve;
  const my = (start.y + end.y) / 2 + (dx / len) * curve;
  return `M ${start.x.toFixed(1)} ${start.y.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
}

export function ContextAssembly() {
  const reduce = useReducedMotion() ?? false;
  const orbital = useMediaQuery("(min-width: 768px)");
  const finePointer = useMediaQuery("(hover: hover) and (pointer: fine)");
  const stageRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const inView = useInView(stageRef, { once: true, amount: 0.32 });
  const [active, setActive] = useState<number | null>(null);
  const [paths, setPaths] = useState<string[]>([]);
  const [stageSize, setStageSize] = useState({ w: 0, h: 0 });

  const cardDur = reduce ? 0.28 : 0.62;
  const cardStagger = reduce ? 0.1 : 0.32;
  const firstCard = reduce ? 0.16 : 0.52;
  const lineLead = reduce ? 0.18 : 0.5;
  const assembledAt = firstCard + (CONTEXTS.length - 1) * cardStagger + cardDur + (reduce ? 0.08 : 0.16);
  const parallax = orbital && finePointer && !reduce;

  useLayoutEffect(() => {
    if (!orbital) return;
    const stage = stageRef.current;
    if (!stage) return;

    const measure = () => {
      const center = centerRef.current;
      if (!center) return;
      const centerBox = boxInStage(center, stage);
      const next = CONTEXTS.map((item, index) => {
        const card = cardRefs.current[index];
        if (!card) return "";
        return connectorPath(boxInStage(card, stage), centerBox, item.bend);
      });
      setPaths(next);
      setStageSize({ w: stage.clientWidth, h: stage.clientHeight });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    cardRefs.current.forEach((card) => {
      if (card) observer.observe(card);
    });
    if (centerRef.current) observer.observe(centerRef.current);
    const fonts = document.fonts?.ready.then(measure);
    return () => {
      observer.disconnect();
      void fonts;
    };
  }, [orbital]);

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!parallax) return;
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty(
      "--px",
      ((event.clientX - rect.left) / rect.width - 0.5).toFixed(3),
    );
    event.currentTarget.style.setProperty(
      "--py",
      ((event.clientY - rect.top) / rect.height - 0.5).toFixed(3),
    );
  }

  function onPointerLeave(event: ReactPointerEvent<HTMLDivElement>) {
    event.currentTarget.style.setProperty("--px", "0");
    event.currentTarget.style.setProperty("--py", "0");
    setActive(null);
  }

  return (
    <div
      ref={stageRef}
      data-context-assembly
      data-assembled={inView ? "true" : "false"}
      className="relative mt-8 flex flex-col gap-4 md:mt-10 md:block md:h-[920px] lg:h-[760px] xl:h-[700px]"
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      {orbital && stageSize.w > 0 ? (
        <svg
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 hidden text-accent md:block"
          width={stageSize.w}
          height={stageSize.h}
          viewBox={`0 0 ${stageSize.w} ${stageSize.h}`}
        >
          {paths.map((d, index) =>
            d ? (
              <Connector
                key={CONTEXTS[index].title}
                d={d}
                active={active === index}
                dimmed={active !== null && active !== index}
                inView={inView}
                reduce={reduce}
                delay={firstCard + index * cardStagger + lineLead}
              />
            ) : null,
          )}
        </svg>
      ) : null}

      <div className="contents">
        <CenterMark
          inView={inView}
          reduce={reduce}
          assembledAt={assembledAt}
          centerRef={centerRef}
        />
        {CONTEXTS.map((item, index) => (
          <ContextCard
            key={item.title}
            item={item}
            index={index}
            inView={inView}
            reduce={reduce}
            orbital={orbital}
            parallax={parallax}
            active={active}
            setActive={setActive}
            cardRef={(node) => {
              cardRefs.current[index] = node;
            }}
            delay={firstCard + index * cardStagger}
            duration={cardDur}
          />
        ))}
      </div>
    </div>
  );
}

function Connector({
  d,
  active,
  dimmed,
  inView,
  reduce,
  delay,
}: {
  d: string;
  active: boolean;
  dimmed: boolean;
  inView: boolean;
  reduce: boolean;
  delay: number;
}) {
  const [shown, setShown] = useState(false);
  const opacity = !shown ? 0 : active ? 0.78 : dimmed ? 0.14 : 0.36;
  const draw = reduce ? 0.2 : 0.55;

  useEffect(() => {
    if (!inView) return;
    const id = window.setTimeout(() => setShown(true), delay * 1000);
    return () => window.clearTimeout(id);
  }, [inView, delay]);

  return (
    <g
      style={{
        opacity,
        transition: reduce ? "none" : "opacity 450ms cubic-bezier(0.22, 1, 0.36, 1)",
      }}
    >
      <motion.path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth={active ? 1.6 : 1.15}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: inView ? 1 : 0 }}
        transition={{ pathLength: { delay, duration: draw, ease: EASE } }}
      />
    </g>
  );
}

function CenterMark({
  inView,
  reduce,
  assembledAt,
  centerRef,
}: {
  inView: boolean;
  reduce: boolean;
  assembledAt: number;
  centerRef: RefObject<HTMLDivElement>;
}) {
  return (
    <div
      ref={centerRef}
      className="order-1 mx-auto flex w-max max-w-full justify-center md:absolute md:left-1/2 md:top-1/2 md:z-10 md:-translate-x-1/2 md:-translate-y-[54%]"
    >
      <motion.div
        className="relative flex flex-col items-center px-4 text-center"
        initial={{ opacity: 0, scale: reduce ? 1 : 0.96 }}
        animate={
          inView
            ? { opacity: 1, scale: 1 }
            : { opacity: 0, scale: reduce ? 1 : 0.96 }
        }
        transition={{ duration: reduce ? 0.28 : 0.55, ease: EASE }}
      >
        <div className="pointer-events-none absolute left-1/2 top-[1.75rem] -translate-x-1/2 -translate-y-1/2">
          <motion.div
            aria-hidden
            className="h-44 w-44 rounded-full lg:h-52 lg:w-52"
            style={{
              background:
                "radial-gradient(circle, rgba(12,107,86,0.16) 0%, rgba(215,235,228,0.45) 42%, transparent 70%)",
            }}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.92 }}
            transition={{
              delay: inView ? assembledAt : 0,
              duration: reduce ? 0.3 : 0.8,
              ease: EASE,
            }}
          />
        </div>
        <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#e5f4ee] text-accent shadow-[inset_1px_1px_0_rgba(255,255,255,0.92),inset_-1px_-1.5px_1px_rgba(14,58,46,0.1),0_1px_1px_rgba(16,40,32,0.05),0_12px_22px_-12px_rgba(16,48,40,0.4)]">
          <motion.span
            aria-hidden
            className="absolute -inset-2.5 rounded-full border border-accent/20"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.94 }}
            transition={{
              delay: inView ? assembledAt : 0,
              duration: reduce ? 0.3 : 0.7,
              ease: EASE,
            }}
          />
          <Sparkle />
        </span>
        <p className="relative mt-4 text-[11px] font-medium uppercase tracking-[0.18em] text-accent">
          Your AI
        </p>
        <p className="relative mt-1.5 font-display text-[1.35rem] leading-tight tracking-[-0.02em] text-fg">
          Built around you
        </p>
      </motion.div>
    </div>
  );
}

function ContextCard({
  item,
  index,
  inView,
  reduce,
  orbital,
  parallax,
  active,
  setActive,
  cardRef,
  delay,
  duration,
}: {
  item: ContextItem;
  index: number;
  inView: boolean;
  reduce: boolean;
  orbital: boolean;
  parallax: boolean;
  active: number | null;
  setActive: (index: number | null) => void;
  cardRef: (node: HTMLDivElement | null) => void;
  delay: number;
  duration: number;
}) {
  const Icon = item.icon;
  const raised = orbital && active === index;
  const dimmed = orbital && active !== null && active !== index;
  const settle = orbital && !reduce;
  const [arrived, setArrived] = useState(false);

  useEffect(() => {
    if (!inView) return;
    const id = window.setTimeout(() => setArrived(true), (delay + duration) * 1000);
    return () => window.clearTimeout(id);
  }, [inView, delay, duration]);

  const entranceDelay = inView && !arrived ? delay : 0;
  const hidden = settle
    ? {
        opacity: 0,
        x: item.enter.x,
        y: item.enter.y,
        scale: 0.96,
        rotate: item.tilt + item.enter.rotate,
        rotateX: item.rx,
        rotateY: item.ry,
        z: 0,
      }
    : {
        opacity: 0,
        x: 0,
        y: reduce ? 0 : 12,
        scale: reduce ? 1 : 0.98,
        rotate: 0,
        rotateX: 0,
        rotateY: 0,
        z: 0,
      };
  const shown = {
    opacity: dimmed ? 0.68 : 1,
    x: 0,
    y: 0,
    scale: dimmed ? 0.985 : 1,
    rotate: settle ? (raised ? item.tilt * 0.2 : item.tilt) : 0,
    rotateX: settle ? (raised ? 0 : item.rx) : 0,
    rotateY: settle ? (raised ? 0 : item.ry) : 0,
    z: raised && !reduce ? 12 : 0,
  };
  const hoverMove = raised && !reduce;

  return (
    <div
      ref={cardRef}
      className={`relative z-10 min-w-0 ${CARD_ORDER[index]} md:order-none ${item.place}`}
    >
      <motion.div
        className="h-full"
        style={settle ? { transformPerspective: 1100 } : undefined}
        initial={hidden}
        animate={inView ? shown : hidden}
        transition={{
          opacity: {
            duration: arrived ? 0.45 : duration,
            delay: entranceDelay,
            ease: EASE,
          },
          x: { duration: arrived ? 0 : duration, delay: entranceDelay, ease: EASE },
          y: { duration: arrived ? 0 : duration, delay: entranceDelay, ease: EASE },
          scale: {
            duration: arrived ? 0.45 : duration,
            delay: entranceDelay,
            ease: EASE,
          },
          rotate: {
            duration: arrived ? 0.5 : duration,
            delay: entranceDelay,
            ease: EASE,
          },
          rotateX: {
            duration: arrived ? 0.5 : duration,
            delay: entranceDelay,
            ease: EASE,
          },
          rotateY: {
            duration: arrived ? 0.5 : duration,
            delay: entranceDelay,
            ease: EASE,
          },
          z: { duration: 0.5, delay: entranceDelay, ease: EASE },
        }}
      >
        <div
          className={parallax ? "transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]" : undefined}
          style={
            parallax
              ? {
                  transform: `translate3d(calc(var(--px, 0) * ${item.depth}px), calc(var(--py, 0) * ${item.depth}px), 0)`,
                }
              : undefined
          }
        >
          <article
            className={`flex h-full flex-col rounded-[20px] border border-border bg-white p-5 transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none md:p-4 ${
              raised ? RAISED_SHADOW : REST_SHADOW
            }`}
            style={{
              transform:
                hoverMove ? "translateY(-4px) scale(1.016)" : "translateY(0px) scale(1)",
            }}
            onMouseEnter={() => {
              if (orbital) setActive(index);
            }}
            onMouseLeave={() => {
              setActive(null);
            }}
          >
            <span
              className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${item.tone}`}
            >
              <Icon className="h-4 w-4" />
            </span>
            <h3 className="mt-3 text-[1.05rem] font-medium text-fg md:mt-3">
              {item.title}
            </h3>
            <p className="mt-2 text-pretty text-sm leading-[1.6] text-muted">{item.body}</p>
            <p className="mt-3 text-pretty rounded-xl bg-[var(--bg)] px-3 py-2.5 text-xs leading-relaxed text-fg">
              {item.example}
            </p>
          </article>
        </div>
      </motion.div>
    </div>
  );
}

function Sparkle() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3Z" />
      <path d="M5 3v4" />
      <path d="M3 5h4" />
    </svg>
  );
}
