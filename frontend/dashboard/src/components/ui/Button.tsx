import { ReactNode, CSSProperties } from "react";

export function Button({
  children,
  variant = "primary",
  onClick,
  className = "",
  disabled = false,
  style,
  type = "button",
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  style?: CSSProperties;
  type?: "button" | "submit" | "reset";
}) {
  return (
    <button
      type={type}
      className={`button button-${variant} ${className}`}
      onClick={onClick}
      disabled={disabled}
      style={{
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        ...style,
      }}
    >
      {children}
    </button>
  );
}
