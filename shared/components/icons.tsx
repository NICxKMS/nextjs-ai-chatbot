import type { SVGProps } from 'react';

export const CrossIcon = ({ size = 16 }: { size?: number }) => (
  <svg
    height={size}
    strokeLinejoin="round"
    style={{ color: 'currentcolor' }}
    viewBox="0 0 16 16"
    width={size}
  >
    <path
      clipRule="evenodd"
      d="M12.4697 13.5303L13 14.0607L14.0607 13L13.5303 12.4697L9.06065 7.99999L13.5303 3.53032L14.0607 2.99999L13 1.93933L12.4697 2.46966L7.99999 6.93933L3.53032 2.46966L2.99999 1.93933L1.93933 2.99999L2.46966 3.53032L6.93933 7.99999L2.46966 12.4697L1.93933 13L2.99999 14.0607L3.53032 13.5303L7.99999 9.06065L12.4697 13.5303Z"
      fill="currentColor"
      fillRule="evenodd"
    />
  </svg>
);

export const LoaderIcon = ({ size = 16 }: { size?: number }) => {
  return (
    <svg
      height={size}
      strokeLinejoin="round"
      style={{ color: 'currentcolor' }}
      viewBox="0 0 16 16"
      width={size}
    >
      <g clipPath="url(#clip0_2393_1490)">
        <path d="M8 0V4" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 16V12" opacity="0.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M3.29773 1.52783L5.64887 4.7639" opacity="0.9" stroke="currentColor" strokeWidth="1.5" />
        <path d="M12.7023 1.52783L10.3511 4.7639" opacity="0.1" stroke="currentColor" strokeWidth="1.5" />
        <path d="M12.7023 14.472L10.3511 11.236" opacity="0.4" stroke="currentColor" strokeWidth="1.5" />
        <path d="M3.29773 14.472L5.64887 11.236" opacity="0.6" stroke="currentColor" strokeWidth="1.5" />
        <path d="M0 8H4" opacity="0.8" stroke="currentColor" strokeWidth="1.5" />
        <path d="M16 8H12" opacity="0.3" stroke="currentColor" strokeWidth="1.5" />
      </g>
      <defs>
        <clipPath id="clip0_2393_1490">
          <rect fill="white" height="16" width="16" />
        </clipPath>
      </defs>
    </svg>
  );
};

export const StopIcon = ({
  size = 16,
  ...props
}: { size?: number } & SVGProps<SVGSVGElement>) => {
  return (
    <svg
      height={size}
      style={{ color: 'currentcolor', ...props.style }}
      viewBox="0 0 16 16"
      width={size}
      {...props}
    >
      <path
        clipRule="evenodd"
        d="M3 3H13V13H3V3Z"
        fill="currentColor"
        fillRule="evenodd"
      />
    </svg>
  );
};

export const ArrowUpIcon = ({ size = 16 }: { size?: number }) => (
  <svg
    height={size}
    strokeLinejoin="round"
    style={{ color: 'currentcolor' }}
    viewBox="0 0 16 16"
    width={size}
  >
    <path
      clipRule="evenodd"
      d="M8.70711 1.39644C8.31659 1.00592 7.68342 1.00592 7.2929 1.39644L2.21968 6.46966L1.68935 6.99999L2.75001 8.06065L3.28034 7.53032L7.25001 3.56065V14.25V15H8.75001V14.25V3.56065L12.7197 7.53032L13.25 8.06065L14.3107 6.99999L13.7803 6.46966L8.70711 1.39644Z"
      fill="currentColor"
      fillRule="evenodd"
    />
  </svg>
);

export const SummarizeIcon = ({ size = 16 }: { size?: number }) => (
  <svg
    height={size}
    strokeLinejoin="round"
    style={{ color: 'currentcolor' }}
    viewBox="0 0 16 16"
    width={size}
  >
    <path
      clipRule="evenodd"
      d="M1.5 2.5H14.5V4.5H1.5V2.5ZM1.5 6.5H10.5V8.5H1.5V6.5ZM14.5 10.5H1.5V12.5H14.5V10.5Z"
      fill="currentColor"
      fillRule="evenodd"
    />
  </svg>
);
