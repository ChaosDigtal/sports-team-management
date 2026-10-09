import { cn } from "@/lib/utils";

const PALETTES = {
  account: [
    "bg-blue-50 text-blue-800 ring-blue-600/20",
    "bg-fuchsia-50 text-fuchsia-800 ring-fuchsia-600/20",
    "bg-lime-50 text-lime-900 ring-lime-600/20",
    "bg-cyan-50 text-cyan-900 ring-cyan-600/20",
    "bg-pink-50 text-pink-800 ring-pink-600/20",
    "bg-yellow-50 text-yellow-900 ring-yellow-600/20",
    "bg-purple-50 text-purple-800 ring-purple-600/20",
    "bg-stone-100 text-stone-800 ring-stone-500/20",
  ],
  user: [
    "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
    "bg-sky-50 text-sky-900 ring-sky-600/20",
    "bg-amber-50 text-amber-900 ring-amber-600/20",
    "bg-violet-50 text-violet-800 ring-violet-600/20",
    "bg-rose-50 text-rose-800 ring-rose-600/20",
    "bg-indigo-50 text-indigo-800 ring-indigo-600/20",
    "bg-teal-50 text-teal-900 ring-teal-600/20",
    "bg-orange-50 text-orange-900 ring-orange-600/20",
  ],
  project: [
    "bg-green-50 text-green-800 ring-green-600/20",
    "bg-blue-50 text-blue-800 ring-blue-600/20",
    "bg-amber-50 text-amber-900 ring-amber-600/20",
    "bg-slate-100 text-slate-800 ring-slate-500/20",
    "bg-red-50 text-red-800 ring-red-600/20",
    "bg-indigo-50 text-indigo-800 ring-indigo-600/20",
  ],
};

export function EntityTag({ id, name, kind }: { id: string; name: string; kind: keyof typeof PALETTES }) {
  const palette = PALETTES[kind];
  const index = [...id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % palette.length;
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", palette[index])}>
      {name}
    </span>
  );
}
