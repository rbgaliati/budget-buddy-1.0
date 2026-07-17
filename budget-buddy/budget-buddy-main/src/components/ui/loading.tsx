import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface SpinnerProps extends HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
  text?: string;
}

/**
 * Spinner de carregamento reutilizável
 */
export const Spinner = forwardRef<HTMLDivElement, SpinnerProps>(
  ({ size = "md", text, className, ...props }, ref) => {
    const sizeClasses = {
      sm: "w-4 h-4",
      md: "w-6 h-6",
      lg: "w-8 h-8",
    };

    return (
      <div ref={ref} className={cn("flex items-center gap-2", className)} {...props}>
        <div
          className={cn(
            "animate-spin rounded-full border-2 border-gray-300 border-t-blue-600",
            sizeClasses[size]
          )}
        />
        {text && <span className="text-sm text-gray-600">{text}</span>}
      </div>
    );
  }
);

Spinner.displayName = "Spinner";

interface LoadingOverlayProps extends HTMLAttributes<HTMLDivElement> {
  isLoading: boolean;
  text?: string;
}

/**
 * Overlay com spinner para estados de carregamento
 */
export const LoadingOverlay = forwardRef<HTMLDivElement, LoadingOverlayProps>(
  ({ isLoading, text, className, children, ...props }, ref) => {
    if (!isLoading) return children;

    return (
      <div
        ref={ref}
        className={cn(
          "relative",
          className
        )}
        {...props}
      >
        {children}
        <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 flex items-center justify-center rounded-lg backdrop-blur-sm">
          <Spinner text={text || "Carregando..."} />
        </div>
      </div>
    );
  }
);

LoadingOverlay.displayName = "LoadingOverlay";

interface LoadingButtonProps extends HTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  loadingText?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

/**
 * Botão com estado de carregamento integrado
 */
export const LoadingButton = forwardRef<HTMLButtonElement, LoadingButtonProps>(
  ({ isLoading, loadingText = "Carregando...", children, disabled, type, className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type || 'button'}
        disabled={isLoading || disabled}
        className={cn(
          "relative inline-flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all",
          "bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed",
          isLoading && "pointer-events-none",
          className
        )}
        {...props}
      >
        {isLoading ? (
          <>
            <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            <span>{loadingText}</span>
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

LoadingButton.displayName = "LoadingButton";

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  count?: number;
  height?: string;
}

/**
 * Skeleton loader para placeholders
 */
export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  ({ count = 1, height = "h-4", className, ...props }, ref) => {
    return (
      <>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            ref={ref}
            className={cn(
              "animate-pulse rounded bg-gray-200 dark:bg-slate-700 mb-2",
              height,
              className
            )}
            {...props}
          />
        ))}
      </>
    );
  }
);

Skeleton.displayName = "Skeleton";
