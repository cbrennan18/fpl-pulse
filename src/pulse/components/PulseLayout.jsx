// src/pulse/components/PulseLayout.jsx
export default function PulseLayout({ children }) {
  return (
    <div className="relative w-full h-screen flex flex-col justify-center items-center bg-black text-white text-left overflow-hidden">
      {/* Background SVG */}
      <div className="absolute inset-0 z-0 animate-pulse-slow">
        <svg viewBox="0 0 540 960" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 w-full h-full">
          <rect x="0" y="0" width="100%" height="100%" fill="#000000" />
          <g transform="translate(540, 0)">
            <path d="M0 459C-72.9 435.1 -145.9 411.1 -217 375.9C-288.1 340.6 -357.5 294 -397.5 229.5C-437.5 165 -448.3 82.5 -459 0L0 0Z" fill="#14532d">
              <animate attributeName="d" dur="8s" repeatCount="indefinite" values="
                M0 459C-72.9 435.1 -145.9 411.1 -217 375.9C-288.1 340.6 -357.5 294 -397.5 229.5C-437.5 165 -448.3 82.5 -459 0L0 0Z;
                M0 459C-100 420 -180 390 -240 350C-300 300 -360 250 -420 180C-450 130 -460 70 -459 0L0 0Z;
                M0 459C-72.9 435.1 -145.9 411.1 -217 375.9C-288.1 340.6 -357.5 294 -397.5 229.5C-437.5 165 -448.3 82.5 -459 0L0 0Z" />
            </path>
          </g>
          <g transform="translate(0, 960)">
            <path d="M0 -459C86.8 -450.7 173.5 -442.5 229.5 -397.5C285.5 -352.5 310.7 -270.9 343.8 -198.5C376.9 -126.1 418 -63.1 459 0L0 0Z" fill="#14532d">
              <animate attributeName="d" dur="8s" repeatCount="indefinite" values="
                M0 -459C86.8 -450.7 173.5 -442.5 229.5 -397.5C285.5 -352.5 310.7 -270.9 343.8 -198.5C376.9 -126.1 418 -63.1 459 0L0 0Z;
                M0 -459C100 -430 180 -400 250 -350C310 -280 350 -200 390 -130C430 -70 450 -30 459 0L0 0Z;
                M0 -459C86.8 -450.7 173.5 -442.5 229.5 -397.5C285.5 -352.5 310.7 -270.9 343.8 -198.5C376.9 -126.1 418 -63.1 459 0L0 0Z" />
            </path>
          </g>
        </svg>
      </div>

      {/* Foreground content */}
      <div className="relative z-10 px-6 w-full">{children}</div>
    </div>
  );
}
