// src/components/TopBar.jsx
import { ArrowLeftIcon } from '@phosphor-icons/react';

export default function TopBar({ title, showBackButton = true, onBack }) {
  return (
    <div className="fixed top-0 left-0 right-0 bg-primary-dark text-white px-4 pt-safe-6 pb-4 z-50">
      <div className="relative flex items-center justify-center">
        {showBackButton && (
          <button onClick={onBack} className="absolute left-0">
            <ArrowLeftIcon size={28} weight="bold" />
          </button>
        )}
        <h1 className="text-xl sm:text-2xl font-bold text-white truncate max-w-[70%] text-center">
            {title}
        </h1>
      </div>
    </div>
  );
}