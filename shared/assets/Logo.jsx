import logoNoir from './logo-noir.svg';

/**
 * Shared Logo component used across all applications
 * To replace the logo, update the logo-noir.svg file in shared/assets/
 */
const Logo = ({ width = 80, height = 80, className = "" }) => {
  return (
    <img
      src={logoNoir}
      alt="Logo"
      width={width}
      height={height}
      className={className}
    />
  );
};

export default Logo;
