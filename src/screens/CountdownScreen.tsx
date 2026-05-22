interface Props { count: number; }

export function CountdownScreen({ count }: Props) {
  return (
    <div className="min-h-screen bg-stone-900 flex items-center justify-center">
      <div className="text-center">
        <p className="text-stone-400 text-xl mb-4 uppercase tracking-widest">Get ready…</p>
        <p className="text-9xl font-black text-orange-400">
          {count === 0 ? 'GO!' : count}
        </p>
      </div>
    </div>
  );
}
