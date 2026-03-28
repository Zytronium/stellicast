import Link from "next/link";
import {Plus, Compass} from "lucide-react";

// ─── Section Components ───────────────────────────────────────────────────────

function SectorsSection() {
    return (
        <Section title="Sectors"
                 description="Communities built around the things you care about. Create a Sector, gather your people, and share videos on your terms.">
            <div className="flex flex-col sm:flex-row gap-3">
                <Link
                    href="/new-sector"
                    className="group flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-lg shadow-primary/20 hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                >
                    <Plus className="w-4 h-4 transition-transform duration-200 group-hover:rotate-90"/>
                    Found a Sector
                </Link>
                <div
                    className="flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl bg-secondary border border-border text-sm font-semibold text-muted-foreground cursor-not-allowed select-none relative overflow-hidden"
                    title="Coming soon"
                >
                    <Compass className="w-4 h-4 opacity-50"/>
                    <span className="opacity-50">Explore Sectors</span>
                    <span className="absolute top-1.5 right-2 text-[7px] font-bold tracking-widest uppercase text-muted-foreground/60">
                        Coming Soon!
                    </span>
                </div>
            </div>
        </Section>
    );
}

// ─── Section Shell ────────────────────────────────────────────────────────────

interface SectionProps {
    title: string;
    description?: string;
    children: React.ReactNode;
}

function Section({title, description, children}: SectionProps) {
    return (
        <section className="w-full max-w-2xl flex flex-col gap-3 animate-[fade-in-up_0.6s_ease-out_forwards]">
            <div className="flex flex-col gap-1">
                <h2 className="text-xl font-bold text-foreground tracking-tight">{title}</h2>
                {description && (
                    <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
                )}
            </div>
            <div>{children}</div>
        </section>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MorePage() {
    return (
        <div className="flex flex-col self-center items-start gap-10 px-2 py-8 max-w-2xl">
            <h1 className="text-3xl font-bold text-foreground tracking-tight">More</h1>
            <hr className="w-full border-border -mt-6"/>
            <SectorsSection/>
            {/* <SubscriptionsSection /> */}
            {/* <LibrarySection /> */}
            {/* <QuickLinksSection /> */}
        </div>
    );
}