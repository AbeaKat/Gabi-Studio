import React from 'react';
import { Lock } from 'lucide-react';
import { PeriodKey, PERIODS } from './financeUtils';

export const SectionCard: React.FC<{
  title: string;
  help: string;
  icon?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, help, icon, right, children }) => (
  <section className="bg-white rounded-3xl border border-nacre-200 shadow-xs p-4 sm:p-6 space-y-4">
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        {icon && (
          <div className="w-10 h-10 rounded-xl bg-coral-50 border border-coral-200 text-coral-600 flex items-center justify-center shrink-0">
            {icon}
          </div>
        )}
        <div>
          <h2 className="text-lg font-extrabold text-deepSlate-900">{title}</h2>
          <p className="text-sm text-deepSlate-500">{help}</p>
        </div>
      </div>
      {right}
    </div>
    {children}
  </section>
);

export const LockedBlock: React.FC<{
  title: string;
  what: string;
  planName: string;
  onTry?: () => void;
}> = ({ title, what, planName, onTry }) => (
  <div className="rounded-3xl border border-dashed border-nacre-300 bg-nacre-50/70 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 rounded-xl bg-white border border-nacre-200 text-deepSlate-500 flex items-center justify-center shrink-0">
        <Lock className="w-5 h-5" />
      </div>
      <div>
        <h3 className="text-base font-extrabold text-deepSlate-900">{title}</h3>
        <p className="text-sm text-deepSlate-600">{what}</p>
        <p className="text-sm text-deepSlate-500 mt-1">Se activa con el plan <strong>{planName}</strong>.</p>
      </div>
    </div>
    {onTry && (
      <button
        type="button"
        onClick={onTry}
        className="px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-coral-500 hover:bg-coral-600 shrink-0"
      >
        Probar con {planName}
      </button>
    )}
  </div>
);

export const EmptyState: React.FC<{ icon?: React.ReactNode; title: string; text: string; action?: React.ReactNode }> = ({
  icon,
  title,
  text,
  action,
}) => (
  <div className="p-6 rounded-2xl bg-nacre-50 border border-nacre-200 text-center space-y-1.5">
    {icon && <div className="flex justify-center text-deepSlate-400">{icon}</div>}
    <p className="text-sm font-extrabold text-deepSlate-900">{title}</p>
    <p className="text-sm text-deepSlate-500 max-w-md mx-auto">{text}</p>
    {action}
  </div>
);

export const PeriodSelector: React.FC<{ value: PeriodKey; onChange: (k: PeriodKey) => void; rangeText: string }> = ({
  value,
  onChange,
  rangeText,
}) => (
  <div className="space-y-1.5">
    <div className="inline-flex flex-wrap gap-1 p-1 rounded-2xl bg-nacre-100 border border-nacre-200" role="tablist" aria-label="Periodo">
      {PERIODS.map((p) => (
        <button
          key={p.key}
          type="button"
          role="tab"
          aria-selected={value === p.key}
          onClick={() => onChange(p.key)}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
            value === p.key ? 'bg-white text-coral-600 shadow-xs border border-nacre-200' : 'text-deepSlate-600 hover:text-deepSlate-900'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
    <p className="text-sm text-deepSlate-500">{rangeText}</p>
  </div>
);
