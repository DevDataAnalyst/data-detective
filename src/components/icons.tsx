import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export function FlameIcon(props: IconProps) {
  return (
    <Icon {...props} fill="currentColor" stroke="none">
      <path d="M12.9 2.3a.75.75 0 0 0-1.2.4c-.5 2.4-1.9 4.1-3.4 5.8C6.6 10.3 5 12.2 5 15a7 7 0 0 0 14 0c0-2.3-1-4.3-2.4-5.9a.75.75 0 0 0-1.3.4c-.2 1.1-.7 2-1.4 2.6.3-3.6-.8-7-1-9.8Zm-.9 18.2a3 3 0 0 1-3-3c0-1.6 1.1-2.7 2.3-3.9.3 1.2 1.2 2 2.2 2.4.6.3 1 .7 1.3 1.3.2.4.2.8.2 1.2a3 3 0 0 1-3 2Z" />
    </Icon>
  );
}

export function BoltIcon(props: IconProps) {
  return (
    <Icon {...props} fill="currentColor" stroke="none">
      <path d="M13.5 2.1a.75.75 0 0 1 .7.9L13 9.5h6a.75.75 0 0 1 .6 1.2l-8.5 11a.75.75 0 0 1-1.3-.6l1.2-6.6H5a.75.75 0 0 1-.6-1.2l8.5-11a.75.75 0 0 1 .6-.2Z" />
    </Icon>
  );
}

export function PathIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="6" cy="19" r="2.5" />
      <circle cx="18" cy="5" r="2.5" />
      <path d="M8.5 19H15a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h6.5" />
    </Icon>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </Icon>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="4.5" y="10.5" width="15" height="10.5" rx="2" />
      <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
    </Icon>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Icon {...props} strokeWidth={3}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </Icon>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Icon {...props} strokeWidth={2.5}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Icon>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Icon {...props} strokeWidth={2.5}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 5 5" />
    </Icon>
  );
}

export function StarIcon(props: IconProps) {
  return (
    <Icon {...props} fill="currentColor" stroke="none">
      <path d="M12 2.5a.8.8 0 0 1 .7.4l2.5 5.2 5.6.8a.8.8 0 0 1 .5 1.4l-4.1 4 1 5.6a.8.8 0 0 1-1.2.9L12 18.1l-5 2.7a.8.8 0 0 1-1.2-.9l1-5.6-4.1-4a.8.8 0 0 1 .5-1.4l5.6-.8 2.5-5.2a.8.8 0 0 1 .7-.4Z" />
    </Icon>
  );
}

export function SnowflakeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 2v20M4.2 7l15.6 10M4.2 17 19.8 7" />
      <path d="m9.5 3.5 2.5 2 2.5-2M9.5 20.5l2.5-2 2.5 2" />
    </Icon>
  );
}

export function TargetIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </Icon>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </Icon>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <Icon {...props} fill="currentColor" stroke="none">
      <path d="M8 5.1a1 1 0 0 1 1.5-.9l10 6.4a1 1 0 0 1 0 1.7l-10 6.4A1 1 0 0 1 8 17.8Z" />
    </Icon>
  );
}

export function LightbulbIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9 18h6M10 21h4" />
      <path d="M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.8V16h5v-.3c0-.7.4-1.4 1-1.8A6 6 0 0 0 12 3Z" />
    </Icon>
  );
}

export function CopyIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="8.5" y="8.5" width="12" height="12" rx="2" />
      <path d="M15.5 8.5V5.5a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3" />
    </Icon>
  );
}

export function DownloadIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M4.5 19.5h15" />
    </Icon>
  );
}

export function RefreshIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M20 12a8 8 0 1 1-2.3-5.7" />
      <path d="M20 4v5h-5" />
    </Icon>
  );
}

export function AlertIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3.5 2.5 20h19Z" />
      <path d="M12 10v4.5M12 17.5v.01" />
    </Icon>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <Icon {...props} strokeWidth={2.5}>
      <path d="m9 5 7 7-7 7" />
    </Icon>
  );
}

export function SparklesIcon(props: IconProps) {
  return (
    <Icon {...props} fill="currentColor" stroke="none">
      <path d="M10 3.5a.6.6 0 0 1 1.1 0l1.3 3.9a3 3 0 0 0 1.9 1.9l3.9 1.3a.6.6 0 0 1 0 1.1l-3.9 1.3a3 3 0 0 0-1.9 1.9l-1.3 3.9a.6.6 0 0 1-1.1 0l-1.3-3.9a3 3 0 0 0-1.9-1.9l-3.9-1.3a.6.6 0 0 1 0-1.1l3.9-1.3a3 3 0 0 0 1.9-1.9Z" />
      <path d="M18.5 2.5a.4.4 0 0 1 .7 0l.5 1.4a1.5 1.5 0 0 0 .9.9l1.4.5a.4.4 0 0 1 0 .7l-1.4.5a1.5 1.5 0 0 0-.9.9l-.5 1.4a.4.4 0 0 1-.7 0l-.5-1.4a1.5 1.5 0 0 0-.9-.9l-1.4-.5a.4.4 0 0 1 0-.7l1.4-.5a1.5 1.5 0 0 0 .9-.9Z" />
    </Icon>
  );
}

export function SunIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
    </Icon>
  );
}

export function MoonIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7Z" />
    </Icon>
  );
}
