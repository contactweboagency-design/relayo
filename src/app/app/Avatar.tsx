export function Avatar({ name }: { name: string }) {
  const hue = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white" style={{ background: `hsl(${hue} 55% 50%)` }}>
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}
