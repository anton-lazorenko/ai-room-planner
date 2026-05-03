"use client";

import { useEffect, useState } from "react";

type Props = {
  onStart: () => void;
};

export function LoadingScreen({ onStart }: Props) {
  const [showButton, setShowButton] = useState(false);
  const [typedTitle, setTypedTitle] = useState("");

  const fullText = "AI Room Planner";

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowButton(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  // TYPEWRITER EFFECT
  useEffect(() => {
    let i = 0;

    let timeout: ReturnType<typeof setTimeout>;

    const type = () => {
      const baseDelay = 80;
      const randomDelay = Math.random() * 120;

      timeout = setTimeout(() => {
        setTypedTitle(fullText.slice(0, i + 1));
        i++;

        if (i < fullText.length) {
          type();
        }
      }, baseDelay + randomDelay);
    };

    type();

    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-black text-white relative">

      {/* BIG TEXT */}
      <h1 className="text-6xl md:text-7xl font-medium tracking-tight text-center">
        <span className="text-blue-500">
          {typedTitle.slice(0, 2)}
        </span>

        {typedTitle.slice(2)}

        {/* cursor исчезает после завершения */}
        {typedTitle.length < fullText.length && (
          <span className="animate-pulse">|</span>
        )}
      </h1>

      {/* subtitle */}
      <p className="text-gray-400 mt-3 text-lg">
        Design your space with intelligence
      </p>

      {/* BUTTON */}
      <div
        className={`
          mt-10 transition-all duration-700 ease-out
          ${showButton ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}
        `}
      >
        <button
          onClick={onStart}
          className="px-8 py-3 bg-white text-black rounded-lg font-medium hover:scale-105 transition"
        >
          Start
        </button>
      </div>

    </div>
  );
}