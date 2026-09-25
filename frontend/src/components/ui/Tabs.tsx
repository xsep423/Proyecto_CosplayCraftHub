import { type ReactNode, useState } from 'react';

interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
  badge?: string | number;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  children: (activeTab: string) => ReactNode;
  className?: string;
}

export default function Tabs({ tabs, defaultTab, children, className = '' }: TabsProps) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.id ?? '');

  return (
    <div className={`flex flex-col ${className}`}>
      <div className="flex items-center gap-0 border-b border-border overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`
              flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap
              border-b-2 -mb-px transition-colors duration-150
              ${active === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:text-text hover:border-border'
              }
            `}
          >
            {tab.icon}
            {tab.label}
            {tab.badge !== undefined && (
              <span className={`
                text-xs px-1.5 py-0.5 rounded-full font-mono
                ${active === tab.id ? 'bg-primary/20 text-primary' : 'bg-panel text-muted'}
              `}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="flex-1">{children(active)}</div>
    </div>
  );
}
