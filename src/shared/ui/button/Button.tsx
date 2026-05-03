"use client";

type ButtonProps = {
  text: string;
  onClick?: () => void;
  className?: string;
};

export function Button({ text, onClick, className }: ButtonProps) {
  return (
    <button onClick={onClick} className={className}>
      {text}
    </button>
  );
}