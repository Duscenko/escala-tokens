// Scalable Designs brand mark — icon + wordmark.
// Uses currentColor throughout so it adapts to light / dark themes.
// The yellow square becomes a semi-transparent fill; star and text track fg.
export default function Logo({ className }: { className?: string }) {
  return (
    <div role="img" aria-label="Scala DS" className={`flex items-center gap-2.5 ${className ?? ''}`}>
      {/* Icon mark — brand square with star burst, all in currentColor */}
      <svg width="34" height="34" viewBox="0 0 68 68" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <path
          d="M0 24C0 10.7452 10.7452 0 24 0H60C64.4183 0 68 3.58172 68 8V44C68 57.2548 57.2548 68 44 68H8C3.58172 68 0 64.4183 0 60V24Z"
          fill="currentColor"
          fillOpacity="0.15"
        />
        <path
          opacity="0.35"
          d="M50.0764 26.7357L47.8407 33.8551L50.0686 40.9593L43.4873 44.4512L40.0108 51.0579L32.8844 48.8233L25.7754 51.0463L22.2794 44.4707L15.6884 41.0116L17.9016 33.8756L15.6738 26.7716L22.2776 23.2961L25.7306 16.6739L32.857 18.9085L39.9667 16.6846L43.4629 23.26L50.0764 26.7357Z"
          fill="currentColor"
        />
        <path
          d="M46.5488 39.3101C41.902 38.5005 37.8816 42.5542 38.6716 47.1913C35.9421 43.347 30.2286 43.3361 27.524 47.1996C28.3277 42.5502 24.2729 38.5254 19.6383 39.3112C23.4786 36.5846 23.4828 30.8697 19.6191 28.1595C24.2673 28.9689 28.2864 24.9154 27.4964 20.2782C30.2259 24.1225 35.9394 24.1321 38.644 20.2698C37.8402 24.9179 41.8964 28.944 46.5297 28.1582C42.6907 30.885 42.6851 36.5999 46.5488 39.3101Z"
          fill="currentColor"
        />
        <path
          d="M42.4141 14H50.4358C52.4048 14 54.001 15.5962 54.001 17.5652V26.4783"
          stroke="currentColor"
          strokeWidth="3.56522"
          fill="none"
        />
        <path
          d="M24.5879 55H16.5662C14.5971 55 13.0009 53.4038 13.0009 51.4348V42.5217"
          stroke="currentColor"
          strokeWidth="3.56522"
          fill="none"
        />
      </svg>

      {/* Wordmark */}
      <span className="font-semibold text-[14px] tracking-[-0.025em] leading-none hidden md:inline">
        Scala DS
      </span>
    </div>
  )
}
