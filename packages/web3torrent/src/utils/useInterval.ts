import {MutableRefObject, useEffect, useRef} from 'react';

export function useInterval(callback, delay: number | boolean = 0) {
  const savedCallback: MutableRefObject<any> = useRef();

  // Remember the latest function.
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval.
  useEffect(() => {
    function tick() {
      savedCallback.current();
    }
    if (delay && typeof delay === 'number' && !Number.isNaN(delay)) {
      const id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
    return () => null;
  }, [delay]);
}
