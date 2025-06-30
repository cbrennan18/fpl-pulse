import PulseLogoAnimated from '../assets/PulseLogoAnimated.svg';

export default function LogoAnimated({ size = 'w-48' }) {
  return (
    <img
      src={PulseLogoAnimated}
      alt="Animated Pulse Logo"
      className={`${size} h-auto`}
    />
  );
}
