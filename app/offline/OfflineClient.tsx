'use client';

// -------- Default spaceblue theme values (from globals.css :root) --------
// Hardcoded so this page renders correctly with zero external CSS loaded.
const C = {
  bg:           '#0a0a0a',
  fg:           '#ffffff',
  border:       '#1f2937',
  primary:      '#2563eb',
  primaryFg:    '#ffffff',
  mutedFg:      '#9ca3af',
  gradFrom:     'rgba(23, 36, 87, 0.8)',
  gradTo:       'rgb(2 6 23 / 0.9)',
  darkFrom:     '#020617',
  darkTo:       '#020203',
  bgAlpha95:    '#0a0a0af2',
} as const;

// -------- Inline SVG icons (Heroicons outline paths) --------

function HomeIcon() {
  return (
      <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
  );
}

function UserIcon() {
  return (
      <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
      </svg>
  );
}

function SettingsIcon() {
  return (
      <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      </svg>
  );
}

function MoreIcon() {
  return (
      <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM18.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
      </svg>
  );
}

const NAV_ITEMS = [
  { href: '/',         label: 'Home',     icon: <HomeIcon />     },
  { href: '/profile',  label: 'Profile',  icon: <UserIcon />     },
  { href: '/settings', label: 'Settings', icon: <SettingsIcon /> },
  { href: '/more',     label: 'More',     icon: <MoreIcon />     },
];

export default function OfflineClient() {
  return (
      <>
        {/*
        Scoped styles for the few things that need media queries:
        - Logo swap (mobile square vs desktop wide)
        - Desktop nav visibility
        - Bottom nav hidden on md+
        - Bottom padding on main to clear the bottom nav on mobile
        This <style> tag lands in the pre-rendered HTML so it works
        even when the external CSS file fails to load.
      */}
        <style>{`
        .ol-logo-sm   { display: block; }
        .ol-logo-lg   { display: none;  }
        .ol-desk-nav  { display: none;  }
        .ol-bot-nav   { display: flex;  }
        .ol-main      { padding-bottom: 4rem; }
        .ol-retry:hover {
          background-color: #2563eb;
        }
        
          @font-face {
            font-family: "Falling Sky";
            src: url("/fonts/FallingSky.otf") format("opentype");
          }

        @media (min-width: 768px) {
          .ol-logo-sm  { display: none;  }
          .ol-logo-lg  { display: block; }
          .ol-bot-nav  { display: none;  }
          .ol-main     { padding-bottom: 0; }
        }

        @media (min-width: 1024px) {
          .ol-desk-nav { display: flex; }
        }
      `}</style>

        {/*
        Fixed overlay covering the entire viewport - sits on top of the
        unstyled ClientLayout skeleton that renders underneath when the
        external CSS file fails to load.
      */}
        <div style={{
          position:        'fixed',
          inset:           0,
          zIndex:          9999,
          display:         'flex',
          flexDirection:   'column',
          backgroundColor: C.bg,
          color:           C.fg,
          fontFamily:      '"Falling Sky", Helvetica, Arial, sans-serif',
          WebkitFontSmoothing: 'antialiased',
        }}>

          {/* -------- TopBar -------- */}
          <header style={{
            height:           '4rem',
            flexShrink:       0,
            position:         'sticky',
            top:              0,
            zIndex:           50,
            borderBottom:     `1px solid ${C.border}`,
            background:       `linear-gradient(to bottom, ${C.gradFrom}, ${C.gradTo})`,
            backdropFilter:   'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display:          'flex',
            alignItems:       'center',
            justifyContent:   'space-between',
            padding:          '0 1rem',
            gap:              '1rem',
          }}>

            {/* Logo */}
            <a href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', flexShrink: 0 }}>
              <img
                  className="ol-logo-sm"
                  src="/logo.png"
                  alt="Stellicast"
                  width={32}
                  height={32}
                  style={{ borderRadius: '0.5rem' }}
              />
              <img
                  className="ol-logo-lg"
                  src="/stellicast_smaller.png"
                  alt="Stellicast"
                  height={32}
                  style={{ height: '2rem', width: 'auto' }}
              />
            </a>

            {/* Flexible gap pushes nav + login to the right */}
            <div style={{ flex: 1 }} />

            {/* Desktop nav (lg+) */}
            <nav className="ol-desk-nav" style={{ gap: '1.5rem', alignItems: 'center' }}>
            </nav>
          </header>

          {/* -------- Main content (no sidebar) -------- */}
          <main className="ol-main" style={{
            flex:       1,
            overflowY:  'auto',
            background: `linear-gradient(to bottom, ${C.darkFrom}, ${C.darkTo})`,
            display:    'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <div style={{ textAlign: 'center', padding: '0 1rem' }}>
              <h1 style={{
                fontSize:     '2.25rem',
                fontWeight:   700,
                margin:       '0 0 1rem',
              }}>
                You&apos;re Offline
              </h1>
              <p style={{
                color:  C.mutedFg,
                margin: '0 0 1.5rem',
              }}>
                Check your internet connection and try again.
              </p>
              <a
                  href=""
                  style={{
                    display: 'inline-block',
                    padding: '0.75rem 1.5rem',
                    background: 'transparent',
                    border: `2px solid ${C.primary}`,
                    borderRadius: '9999px',
                    color: C.fg,
                    fontWeight: 600,
                    fontSize: '1rem',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    textDecoration: 'none',
                  }}
                  className="ol-retry"
              >
                Retry
              </a>
            </div>
          </main>

          {/* -------- BottomNav (mobile only via .ol-bot-nav) -------- */}
          <nav className="ol-bot-nav" style={{
            position:        'fixed',
            bottom:          0,
            left:            0,
            right:           0,
            zIndex:          40,
            borderTop:       `1px solid ${C.border}`,
            backgroundColor: C.bgAlpha95,
            backdropFilter:  'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            height:          '4rem',
            alignItems:      'center',
            justifyContent:  'space-around',
            padding:         '0 0.5rem',
            paddingBottom:   'env(safe-area-inset-bottom)',
          }}>
            {NAV_ITEMS.map(item => (
                <a key={item.href} href={item.href} style={{
                  display:        'flex',
                  flexDirection:  'column',
                  alignItems:     'center',
                  justifyContent: 'center',
                  flex:           1,
                  height:         '100%',
                  gap:            '0.25rem',
                  color:          C.mutedFg,
                  textDecoration: 'none',
                  fontSize:       '0.75rem',
                  fontWeight:     500,
                }}>
                  {item.icon}
                  <span>{item.label}</span>
                </a>
            ))}
          </nav>

        </div>
      </>
  );
}
