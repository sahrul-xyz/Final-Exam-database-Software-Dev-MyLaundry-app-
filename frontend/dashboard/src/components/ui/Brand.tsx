export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand">
      <svg
        className="brand-mark"
        viewBox="0 0 48 48"
        role="img"
        aria-label="Logo MyLaundry"
      >
        <rect width="48" height="48" rx="15" />
        <path className="logo-lid" d="M14 13.5h20" />
        <circle className="logo-dot" cx="32.5" cy="9.5" r="1.8" />
        <circle className="logo-drum" cx="24" cy="27" r="11.5" />
        <path
          className="logo-wave"
          d="M13.5 27.2c3.1-2.8 6.3-2.8 9.5 0s6.4 2.8 11.5-.4"
        />
        <path
          className="logo-wave logo-wave-small"
          d="M16 31.5c2.5-1.7 5-1.7 7.5 0s5 1.7 8.2-.2"
        />
      </svg>
      {!compact && (
        <strong>
          <span>My</span>Laundry
        </strong>
      )}
    </div>
  );
}
