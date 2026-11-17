export function PicoLogoSvg({ className = '' }: { className?: string }) {
  // Renders the standalone logo asset at /public/brand-logo.svg
  return (
    <img
      src="/brand-logo.svg"
      alt="307 Park"
      width={436}
      height={112}
      draggable={false}
      className={className}
    />
  );
}
