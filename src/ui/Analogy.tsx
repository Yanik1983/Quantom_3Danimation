import { RichText } from './RichText';

/** Every analogy is explicitly labelled as one — analogies are aids, not physics. */
export function Analogy({ text }: { text: string }) {
  return (
    <aside className="rounded-xl border border-violet/30 bg-violet/10 px-4 py-3 text-sm leading-relaxed text-slate-200">
      <p className="mb-1 text-[0.65rem] font-semibold tracking-[0.18em] text-violet uppercase">
        Analogy — not literal physics
      </p>
      <p>
        <RichText text={text} />
      </p>
    </aside>
  );
}
