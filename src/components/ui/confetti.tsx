"use client";

import type { ReactNode } from "react";
import React, {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  CreateTypes,
  GlobalOptions,
  Options as ConfettiOptions,
} from "canvas-confetti";
import confetti from "canvas-confetti";

import type { ButtonProps } from "@/components/ui/button";
import { Button } from "@/components/ui/button";

interface ConfettiProps extends GlobalOptions {
  children?: ReactNode;
  options?: ConfettiOptions;
  globalOptions?: GlobalOptions;
  manualstart?: boolean;
}

export interface ConfettiRef {
  fire: () => void;
}

const ConfettiContext = createContext<ConfettiRef | null>(null);

export const useConfetti = () => {
  const context = useContext(ConfettiContext);
  if (!context) {
    throw new Error("useConfetti must be used within a ConfettiProvider");
  }
  return context;
};

const Confetti = forwardRef<ConfettiRef, ConfettiProps>(
  (
    { options, globalOptions = { resize: true }, manualstart = false },
    ref,
  ) => {
    const instanceRef = useRef<CreateTypes | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isReady, setIsReady] = useState(false);

    const fire = useCallback(
      (opts: ConfettiOptions = {}) => {
        if (isReady && instanceRef.current) {
          void instanceRef.current({ ...options, ...opts });
        }
      },
      [isReady, options],
    );

    useImperativeHandle(ref, () => ({
      fire,
    }));

    const initializeConfetti = useCallback(() => {
      if (!canvasRef.current) return;

      if (instanceRef.current) {
        instanceRef.current.reset();
      }

      instanceRef.current = confetti.create(canvasRef.current, {
        ...globalOptions,
        resize: true,
      });

      setIsReady(true);
    }, [globalOptions]);

    useEffect(() => {
      initializeConfetti();
    }, [initializeConfetti]);

    useEffect(() => {
      if (!manualstart && isReady) {
        fire();
      }
    }, [manualstart, isReady, fire]);

    const confettiValue = useMemo(() => ({ fire }), [fire]);

    return (
      <ConfettiContext.Provider value={confettiValue}>
        <canvas
          ref={canvasRef}
          className="pointer-events-none fixed inset-0 z-[100] size-full"
        />
      </ConfettiContext.Provider>
    );
  },
);

Confetti.displayName = "Confetti";

interface ConfettiButtonProps extends ButtonProps {
  options?: ConfettiOptions & { canvas?: HTMLCanvasElement };
  children?: React.ReactNode;
}

function ConfettiButton({ options, children, ...props }: ConfettiButtonProps) {
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    confetti({
      ...options,
      origin: {
        x: x / window.innerWidth,
        y: y / window.innerHeight,
      },
    });
  };

  return (
    <Button onClick={handleClick} {...props}>
      {children}
    </Button>
  );
}

export { Confetti, ConfettiButton };
