import React, { useEffect, useRef, useState } from 'react';

export default function CursorFollower() {
  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  
  const mousePos = useRef({ x: -100, y: -100 });
  const circlePos = useRef({ x: -100, y: -100 });
  const dotRef = useRef<HTMLDivElement>(null);
  const circleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
      if (!isVisible) setIsVisible(true);

      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'BUTTON' || target.tagName === 'A' || target.tagName === 'INPUT' || target.closest('button') || target.closest('a'))) {
        setIsHovered(true);
      } else {
        setIsHovered(false);
      }
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    let animationFrameId: number;

    const animate = () => {
      // Smooth lerp for flexible fluid motion (0.15 interpolation factor)
      circlePos.current.x += (mousePos.current.x - circlePos.current.x) * 0.18;
      circlePos.current.y += (mousePos.current.y - circlePos.current.y) * 0.18;

      if (circleRef.current) {
        circleRef.current.style.transform = `translate3d(${circlePos.current.x}px, ${circlePos.current.y}px, 0) translate(-50%, -50%)`;
      }
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${mousePos.current.x}px, ${mousePos.current.y}px, 0) translate(-50%, -50%)`;
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <>
      {/* Outer Elastic Spring Ring */}
      <div
        ref={circleRef}
        className={`pointer-events-none fixed top-0 left-0 z-[9999] rounded-full border-2 border-emerald-400 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.6)] transition-all duration-300 ease-out ${
          isHovered ? 'w-14 h-14 border-emerald-300 bg-emerald-500/20 scale-125 shadow-[0_0_30px_rgba(52,211,153,0.8)]' : 'w-10 h-10'
        }`}
        style={{
          willChange: 'transform',
        }}
      />
      {/* Inner Immediate Center Dot */}
      <div
        ref={dotRef}
        className="pointer-events-none fixed top-0 left-0 z-[10000] w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_#34d399]"
        style={{
          willChange: 'transform',
        }}
      />
    </>
  );
}
