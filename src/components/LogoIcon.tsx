export function LogoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
      <g fill="none" stroke="currentColor" strokeWidth="46" strokeLinecap="round">
        {/* Z mark: the top and bottom bars are split down the middle, a nod to split keyboards */}
        <path d="M106 154h118" />
        <path d="M288 154h118" />
        <path d="M406 154 106 358" />
        <path d="M106 358h118" />
        <path d="M288 358h118" />
      </g>
    </svg>
  );
}
