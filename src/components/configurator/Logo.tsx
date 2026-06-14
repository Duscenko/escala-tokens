export default function Logo({ className }: { className?: string }) {
  return (
    <div role="img" aria-label="ScalaDesign" className={`flex items-center gap-2.5 ${className ?? ''}`}>
      {/* Icon mark — star burst in dark pill */}
      <svg width="34" height="33" viewBox="0 0 36 33.2174" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <rect width="36" height="33.2174" rx="16.6087" fill="#1C1C1C" />
        <path
          opacity="0.3"
          d="M27.8638 12.5199L26.5818 16.6025L27.8594 20.6764L24.0853 22.6789L22.0918 26.4674L18.0051 25.1861L13.9286 26.4608L11.9237 22.69L8.14412 20.7064L9.41326 16.6143L8.13574 12.5405L11.9227 10.5475L13.9028 6.75L17.9895 8.03142L22.0665 6.75614L24.0713 10.5268L27.8638 12.5199Z"
          fill="white"
        />
        <path
          d="M25.8422 19.7306C23.1776 19.2664 20.872 21.591 21.325 24.2502C19.7598 22.0456 16.4834 22.0394 14.9324 24.2549C15.3934 21.5886 13.0681 19.2807 10.4104 19.7313C12.6126 18.1677 12.6151 14.8905 10.3994 13.3363C13.0648 13.8005 15.3696 11.476 14.9166 8.81678C16.4818 11.0213 19.7582 11.0268 21.3092 8.81201C20.8483 11.4774 23.1743 13.7862 25.8312 13.3356C23.6298 14.8993 23.6266 18.1765 25.8422 19.7306Z"
          fill="white"
        />
      </svg>
      <span className="font-semibold text-[15px] tracking-[-0.02em] leading-none">ScalaDesign</span>
    </div>
  )
}
