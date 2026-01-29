import * as React from "react";

export function FigmaIcon({
  size = 24,
  color = "currentColor",
  strokeWidth = 2,
  className,
  ...props
}: React.SVGProps<SVGSVGElement> & {
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M8.5 2a3 3 0 0 0 0 6h7a3 3 0 1 0 0-6zm7 7a3 3 0 1 0 0 6a3 3 0 0 0 0-6m-10 3a3 3 0 0 1 3-3h3v6h-3a3 3 0 0 1-3-3m3 4a3 3 0 1 0 3 3v-3z"/>
    </svg>
  );
}
