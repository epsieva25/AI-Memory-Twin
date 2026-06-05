import React, { useState, useEffect, useRef } from 'react';
import { ResponsiveContainer } from 'recharts';

/**
 * Wraps Recharts ResponsiveContainer so charts only render after the parent
 * has measurable dimensions (avoids width/height -1 warnings).
 */
const ChartContainer = ({ height = 256, minHeight = 200, className = '', children }) => {
  const ref = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const check = () => {
      const { width, height: h } = el.getBoundingClientRect();
      setReady(width > 0 && h > 0);
    };

    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const style = { height: typeof height === 'number' ? `${height}px` : height, minHeight };

  return (
    <div ref={ref} className={`w-full min-w-0 ${className}`} style={style}>
      {ready ? (
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      ) : null}
    </div>
  );
};

export default ChartContainer;
