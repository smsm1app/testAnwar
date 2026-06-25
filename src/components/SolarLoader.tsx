import React from 'react';

export default function SolarLoader() {
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="solar-loader-module">
        <svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg">
          <g className="sun-orbit">
            <circle cx="50" cy="40" r="15" fill="#f59e0b" className="sun-core" />
            <path d="M 50 10 A 1 1 0 0 1 50 70 A 1 1 0 0 1 50 10 M 50 15 A 1 1 0 0 0 50 65 A 1 1 0 0 0 50 15" fill="#fef3c7" fillOpacity={0.2} />
          </g>
          <g className="panel-representation">
            <rect x="25" y="80" width="50" height="30" rx="3" fill="#334155" />
            <g className="cell-grid">
              <rect x="30" y="85" width="10" height="10" rx="1" fill="#cbd5e1" className="cell cell-1" />
              <rect x="45" y="85" width="10" height="10" rx="1" fill="#cbd5e1" className="cell cell-2" />
              <rect x="60" y="85" width="10" height="10" rx="1" fill="#cbd5e1" className="cell cell-3" />
              <rect x="30" y="98" width="10" height="10" rx="1" fill="#cbd5e1" className="cell cell-4" />
              <rect x="45" y="98" width="10" height="10" rx="1" fill="#cbd5e1" className="cell cell-5" />
              <rect x="60" y="98" width="10" height="10" rx="1" fill="#cbd5e1" className="cell cell-6" />
            </g>
          </g>
        </svg>
      </div>

      <style>{`
        /* Main container settings */
        .solar-loader-module {
            width: 100px; /* match the original icon's scale */
            height: 120px;
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }
        .solar-loader-module svg {
            width: 100%;
            height: 100%;
        }

        /* Staggered sequential cell charging animation */
        .cell {
            animation: cell-charge 1.5s linear infinite;
            opacity: 0.2;
        }
        @keyframes cell-charge {
            0%, 100% { opacity: 0.2; }
            10% { opacity: 1; fill: #f59e0b; } /* charged colour */
            20% { opacity: 0.2; fill: #cbd5e1; } /* back to base colour */
        }

        /* specific delays for sequential charging sequence */
        .cell-1 { animation-delay: 0s; }
        .cell-2 { animation-delay: 0.1s; }
        .cell-3 { animation-delay: 0.2s; }
        .cell-4 { animation-delay: 0.3s; }
        .cell-5 { animation-delay: 0.4s; }
        .cell-6 { animation-delay: 0.5s; }
        
        /* Centered pulsing sun core */
        .sun-core {
            animation: sun-pulse 2s ease-in-out infinite;
            transform-origin: 50px 40px;
        }
        @keyframes sun-pulse {
            0%, 100% { r: 15; opacity: 1; }
            50% { r: 17; opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}
