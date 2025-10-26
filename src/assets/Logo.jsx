// You can replace this SVG with an image by importing it like:
// import logo from './logo.png'
// export default logo

// For now, we export the SVG as a React component
const Logo = ({ width = 80, height = 80, className = "" }) => {
  return (
    <svg width={width} height={height} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="60" cy="60" r="58" stroke="url(#gradient)" strokeWidth="3"/>
      <path d="M60 25 L60 95 M40 45 L60 25 L80 45" stroke="url(#gradient)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="60" cy="85" r="8" fill="url(#gradient)"/>
      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#491ae9" />
          <stop offset="33%" stopColor="#b300c7" />
          <stop offset="66%" stopColor="#f20075" />
          <stop offset="100%" stopColor="#ff8400" />
        </linearGradient>
      </defs>
    </svg>
  );
};

export default Logo;
