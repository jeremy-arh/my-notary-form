import logoNoir from './logo-noir.svg?url';

/**
 * Logo component for Client Dashboard
 * To replace the logo, update the logo-noir.svg file in this directory
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
