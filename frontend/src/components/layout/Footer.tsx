import { Link } from 'react-router-dom';
import Logo from './Logo';

const COLUMNS = [
  {
    title: 'Practice',
    links: [
      { to: '/upload', label: 'Resume interview' },
      { to: '/tech-interview', label: 'Technical round' },
      { to: '/job-prep', label: 'Job prep' },
    ],
  },
  {
    title: 'Resume studio',
    links: [
      { to: '/builder', label: 'Builder' },
      { to: '/saved', label: 'Saved resumes' },
      { to: '/job-roadmap', label: 'Roadmap' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-border bg-background no-print">
      <div className="container-page py-12">
        <div className="grid gap-10 sm:grid-cols-[1.6fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-muted-foreground">
              A resume-aware interview studio. Practice the questions before they matter,
              then review exactly how you answered.
            </p>
            <p className="mt-4 font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground/80">
              No account · Local-first · Free
            </p>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.title}>
              <p className="section-label mb-3">{column.title}</p>
              <ul className="space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-border pt-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} HireIQ. Built for practice, not pressure.</p>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.1em]">No account required</p>
        </div>
      </div>
    </footer>
  );
}
