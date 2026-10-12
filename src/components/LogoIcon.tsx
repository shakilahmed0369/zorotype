export function LogoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
      <line x1="120" y1="100" x2="120" y2="400" stroke="currentColor" strokeWidth="40" strokeLinecap="round" />
      <line x1="120" y1="400" x2="400" y2="400" stroke="currentColor" strokeWidth="40" strokeLinecap="round" />
      <polyline
        points="160,340 220,300 270,340 320,240 360,280 420,200"
        fill="none"
        stroke="currentColor"
        strokeWidth="40"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
