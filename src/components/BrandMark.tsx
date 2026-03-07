export function BrandMark() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id="wedge-mark" x1="3" y1="3" x2="26" y2="26" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4C84F7" />
          <stop offset="1" stopColor="#2152BF" />
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="26" height="26" rx="10" fill="url(#wedge-mark)" />
      <path
        d="M11.5 11.5H20.5C21.8807 11.5 23 12.6193 23 14V18C23 19.3807 21.8807 20.5 20.5 20.5H16.25L13.25 23.5V20.5H11.5C10.1193 20.5 9 19.3807 9 18V14C9 12.6193 10.1193 11.5 11.5 11.5Z"
        fill="rgba(255,255,255,0.96)"
      />
      <path d="M14 16H18.5" stroke="#2152BF" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M14 13.75H19.75" stroke="#2152BF" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M14 18.25H17" stroke="#2152BF" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}
