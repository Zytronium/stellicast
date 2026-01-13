export default function UnderConstruction() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md text-center space-y-8">
        {/* Logo */}
        <div className="flex justify-center">
          <img
            src="/logo.png"
            alt="Stellicast"
            className="h-20 w-20 object-contain hue-rotate-(--logo-hue-rotate)"
            style={{ animation: 'var(--animate-float)' }}
          />
        </div>

        {/* Heading */}
        <div className="space-y-3">
          <h1
            className="text-3xl font-semibold tracking-tight text-foreground"
            style={{ animation: 'var(--animate-fade-in-up)' }}
          >
            Under Construction
          </h1>
          <p
            className="text-muted-foreground text-base"
            style={{ animation: 'var(--animate-fade-in-up)', animationDelay: '0.1s', opacity: 0, animationFillMode: 'forwards' }}
          >
            We&apos;re working on something great. Check back soon!
          </p>
        </div>

        {/* Progress indicator */}
        <div
          className="w-full space-y-2"
          style={{ animation: 'var(--animate-fade-in-up)', animationDelay: '0.2s', opacity: 0, animationFillMode: 'forwards' }}
        >
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div className="h-full w-2/3 bg-gradient-to-r from-primary to-primary/90 rounded-full" />
          </div>
          <p className="text-xs text-muted-foreground">Building in progress...</p>
        </div>

        {/* Back button */}
        <div
          style={{ animation: 'var(--animate-fade-in-up)', animationDelay: '0.3s', opacity: 0, animationFillMode: 'forwards' }}
        >
          <a
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
