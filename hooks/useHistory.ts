import { useState, useCallback } from 'react';

export const useHistory = <T,>(initialState: T) => {
  const [history, setHistory] = useState<T[]>([initialState]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const state = history[currentIndex];

  const setState = useCallback((value: T) => {
    // If the new value is the same as the current state, do nothing.
    if (JSON.stringify(value) === JSON.stringify(history[currentIndex])) {
      return;
    }
    const newHistory = history.slice(0, currentIndex + 1);
    newHistory.push(value);
    setHistory(newHistory);
    setCurrentIndex(newHistory.length - 1);
  }, [history, currentIndex]);
  
  const resetState = useCallback((newInitialState: T) => {
    setHistory([newInitialState]);
    setCurrentIndex(0);
  }, []);

  const undo = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);

  const redo = useCallback(() => {
    if (currentIndex < history.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex, history.length]);

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  return { state, setState, resetState, undo, redo, canUndo, canRedo };
};
