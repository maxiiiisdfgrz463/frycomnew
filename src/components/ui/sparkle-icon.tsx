import React from "react";

interface SparkleIconProps {
  className?: string;
}

const SparkleIcon: React.FC<SparkleIconProps> = ({ className }) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 512 512"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path d="M259.92 262.91L216.4 134.44c-9.5-28.12-48.8-28.12-58.3 0L114.57 262.91 13.23 291.09c-26.5 7.34-26.5 45.54 0 52.88l101.34 28.19 43.53 128.47c9.5 28.12 48.8 28.12 58.3 0l43.53-128.47 101.34-28.19c26.5-7.34 26.5-45.54 0-52.88l-101.34-28.19z" />
      <path d="M387.92 156.91L358.4 69.44c-6.5-19.22-33.4-19.22-39.9 0l-29.53 87.47-69.34 19.29c-18.1 5.02-18.1 31.14 0 36.16l69.34 19.29 29.53 87.47c6.5 19.22 33.4 19.22 39.9 0l29.53-87.47 69.34-19.29c18.1-5.02 18.1-31.14 0-36.16l-69.34-19.29z" />
    </svg>
  );
};

export default SparkleIcon;
