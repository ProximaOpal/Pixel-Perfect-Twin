import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { LogIn, ArrowRightCircle, ArrowLeftCircle, LogOut } from 'lucide-react';

/**
 * A radial "day watch" preview of the vessel's schedule — drag any marker to
 * re-time that leg. Segment colors carry the same meaning everywhere in the
 * app: green = underway to the event, blue = at the event, amber = heading
 * back, matching the STAGE_META palette used elsewhere in the proposal flow.
 */

type Key = 'embark' | 'depart' | 'ret' | 'disembark';
type FieldKey = 'embarkation' | 'departure' | 'returnTime' | 'disembarkation';

const ORDER: Key[] = ['embark', 'depart', 'ret', 'disembark'];
const FIELD: Record<Key, FieldKey> = {
  embark: 'embarkation',
  depart: 'departure',
  ret: 'returnTime',
  disembark: 'disembarkation',
};
const META: Record<Key, { label: string; color: string; Icon: typeof LogIn }> = {
  embark: { label: 'Embarkation', color: '#2ecc71', Icon: LogIn },
  depart: { label: 'Departure', color: '#3b82f6', Icon: ArrowRightCircle },
  ret: { label: 'Return', color: '#e8b93f', Icon: ArrowLeftCircle },
  disembark: { label: 'Disembarkation', color: '#1a1a1a', Icon: LogOut },
};

const cx = 100;
const cy = 100;
const R = 76;
const tickOuter = 66;
const tickInner = 60;
const DAY_START = 8;
const DAY_END = 22;
const ARC_START = 135;
const ARC_SWEEP = 270;

function polar(r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
function hourToDeg(h: number) {
  return ARC_START + ((h - DAY_START) / (DAY_END - DAY_START)) * ARC_SWEEP;
}
function degToHour(deg: number) {
  return DAY_START + ((deg - ARC_START) / ARC_SWEEP) * (DAY_END - DAY_START);
}
function describeArc(r: number, startDeg: number, endDeg: number) {
  const p1 = polar(r, startDeg);
  const p2 = polar(r, endDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${p1.x} ${p1.y} A ${r} ${r} 0 ${largeArc} 1 ${p2.x} ${p2.y}`;
}
function snapQuarter(h: number) {
  return Math.round(h * 4) / 4;
}
function fmtHour(h: number) {
  h = Math.max(DAY_START, Math.min(DAY_END, h));
  let hh = Math.floor(h);
  let mm = Math.round((h - hh) * 60);
  if (mm === 60) {
    mm = 0;
    hh += 1;
  }
  const period = hh >= 12 ? 'PM' : 'AM';
  let h12 = hh % 12;
  if (h12 === 0) h12 = 12;
  return `${String(h12).padStart(2, '0')}:${String(mm).padStart(2, '0')} ${period}`;
}
function hourToHHMM(h: number) {
  h = Math.max(DAY_START, Math.min(DAY_END, h));
  let hh = Math.floor(h);
  let mm = Math.round((h - hh) * 60);
  if (mm === 60) {
    mm = 0;
    hh += 1;
  }
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}
function hhmmToHour(str: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(str || '');
  if (!m) return DAY_START;
  return Math.max(DAY_START, Math.min(DAY_END, parseInt(m[1], 10) + parseInt(m[2], 10) / 60));
}

export function ItineraryWatch({
  embarkation,
  departure,
  returnTime,
  disembarkation,
  onChangeField,
}: {
  embarkation: string;
  departure: string;
  returnTime: string;
  disembarkation: string;
  onChangeField: (key: FieldKey, value: string) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<Key | null>(null);

  const hours: Record<Key, number> = {
    embark: hhmmToHour(embarkation),
    depart: hhmmToHour(departure),
    ret: hhmmToHour(returnTime),
    disembark: hhmmToHour(disembarkation),
  };

  const clampToNeighbors = (key: Key, h: number) => {
    const idx = ORDER.indexOf(key);
    const min = idx === 0 ? DAY_START : hours[ORDER[idx - 1]];
    const max = idx === ORDER.length - 1 ? DAY_END : hours[ORDER[idx + 1]];
    return Math.max(min, Math.min(max, h));
  };

  const angleFromEvent = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return ARC_START;
    const rect = svg.getBoundingClientRect();
    const scaleX = 200 / rect.width;
    const scaleY = 200 / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    let deg = (Math.atan2(y - cy, x - cx) * 180) / Math.PI;
    deg = (deg + 360) % 360;
    if (deg < ARC_START) deg += 360;
    return Math.max(ARC_START, Math.min(ARC_START + ARC_SWEEP, deg));
  }, []);

  const updateFromPointer = (key: Key, clientX: number, clientY: number) => {
    let h = snapQuarter(degToHour(angleFromEvent(clientX, clientY)));
    h = clampToNeighbors(key, h);
    onChangeField(FIELD[key], hourToHHMM(h));
  };

  const handlePointerDown = (key: Key) => (e: ReactPointerEvent<SVGCircleElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(key);
  };
  const handlePointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!dragging) return;
    updateFromPointer(dragging, e.clientX, e.clientY);
  };
  const endDrag = () => setDragging(null);

  const totalQuarters = (DAY_END - DAY_START) * 4;
  const ticks = Array.from({ length: totalQuarters + 1 }, (_, i) => {
    const h = DAY_START + i / 4;
    const deg = hourToDeg(h);
    const major = i % 4 === 0;
    const p1 = polar(tickOuter, deg);
    const p2 = polar(major ? tickInner - 3 : tickInner, deg);
    return (
      <line
        key={i}
        x1={p1.x}
        y1={p1.y}
        x2={p2.x}
        y2={p2.y}
        stroke="#1a1a1a"
        strokeOpacity={major ? 0.35 : 0.15}
        strokeWidth={major ? 1.4 : 1}
      />
    );
  });

  const labels = [];
  for (let h = DAY_START; h <= DAY_END; h += 2) {
    const deg = hourToDeg(h);
    const p = polar(50, deg);
    let hh = h % 12;
    if (hh === 0) hh = 12;
    labels.push(
      <text key={h} x={p.x} y={p.y + 2.5} textAnchor="middle" fontSize={6} fontWeight={700} fill="#1a1a1a" opacity={0.35}>
        {hh}{h < 12 ? 'am' : 'pm'}
      </text>,
    );
  }

  return (
    <div className="mt-2 flex flex-col items-center rounded-[10px] border border-[#e3e6e4] bg-[#fafcfa] py-6">
      <svg
        ref={svgRef}
        viewBox="0 0 200 200"
        className="h-[220px] w-[220px] touch-none select-none"
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <path d={describeArc(R, ARC_START, ARC_START + ARC_SWEEP)} fill="none" stroke="#e3e6e4" strokeWidth={6} strokeLinecap="round" />
        <path d={describeArc(R, hourToDeg(hours.embark), hourToDeg(hours.depart))} fill="none" stroke={META.embark.color} strokeWidth={6} strokeLinecap="round" />
        <path d={describeArc(R, hourToDeg(hours.depart), hourToDeg(hours.ret))} fill="none" stroke={META.depart.color} strokeWidth={6} strokeLinecap="round" />
        <path d={describeArc(R, hourToDeg(hours.ret), hourToDeg(hours.disembark))} fill="none" stroke={META.ret.color} strokeWidth={6} strokeLinecap="round" />
        <g>{ticks}</g>
        <g>{labels}</g>
        {ORDER.map((key) => {
          const p = polar(R, hourToDeg(hours[key]));
          return (
            <circle
              key={key}
              cx={p.x}
              cy={p.y}
              r={9}
              fill={META[key].color}
              stroke="#fff"
              strokeWidth={2}
              onPointerDown={handlePointerDown(key)}
              className="cursor-grab active:cursor-grabbing"
            />
          );
        })}
      </svg>

      <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-2.5 px-4">
        {ORDER.map((key) => {
          const { label, color, Icon } = META[key];
          return (
            <div key={key} className="flex items-center gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: color }}>
                <Icon className="h-3 w-3 text-white" />
              </span>
              <div className="leading-tight">
                <p className="text-[9.5px] font-bold uppercase tracking-wide text-[#7c8a82]">{label}</p>
                <p className="text-[12px] font-semibold text-gray-800">{fmtHour(hours[key])}</p>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[10.5px] text-gray-400">Drag the colored markers to fine-tune the day's schedule.</p>
    </div>
  );
}

export default ItineraryWatch;
