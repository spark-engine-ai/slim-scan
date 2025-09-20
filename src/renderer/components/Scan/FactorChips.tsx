import React from 'react';
import { ScanResult, FactorScore, FactorKey } from '../../types/models';
import { useSettings } from '../../store/useSettings';

interface FactorChipsProps {
  result: ScanResult;
}

export function FactorChips({ result }: FactorChipsProps) {
  const { settings } = useSettings();

  if (!settings) return null;

  const factors: FactorScore[] = [
    {
      key: 'C',
      label: 'Current Earnings',
      value: result.c_qoq,
      threshold: settings.scanConfig.thresholds.C_yoy,
      pass: result.c_qoq >= settings.scanConfig.thresholds.C_yoy,
      description: 'Current quarter earnings vs same quarter last year',
    },
    {
      key: 'A',
      label: 'Annual Earnings',
      value: result.a_cagr,
      threshold: settings.scanConfig.thresholds.A_cagr,
      pass: result.a_cagr >= settings.scanConfig.thresholds.A_cagr,
      description: '3-year annual earnings growth rate',
    },
    {
      key: 'N',
      label: 'New Highs',
      value: result.pct_52w,
      threshold: settings.scanConfig.thresholds.N_pct52w,
      pass: result.pct_52w >= settings.scanConfig.thresholds.N_pct52w,
      description: 'Price as percentage of 52-week high',
    },
    {
      key: 'S',
      label: 'Supply & Demand',
      value: result.vol_spike,
      threshold: settings.scanConfig.thresholds.S_volSpike,
      pass: result.vol_spike >= settings.scanConfig.thresholds.S_volSpike,
      description: 'Volume spike vs 50-day average',
    },
    {
      key: 'L',
      label: 'Leader/Laggard',
      value: result.rs_pct,
      threshold: settings.scanConfig.thresholds.RS_pct,
      pass: result.rs_pct >= settings.scanConfig.thresholds.RS_pct,
      description: 'Relative strength percentile vs universe',
    },
    {
      key: 'I',
      label: 'Institutional',
      value: result.i_delta,
      threshold: 0, // TODO: Add threshold for institutional
      pass: result.i_delta > 0,
      description: 'Institutional ownership change',
    },
    {
      key: 'M',
      label: 'Market Direction',
      value: 1, // TODO: Implement market direction analysis
      threshold: 1,
      pass: true, // TODO: Determine market direction (bull/bear)
      description: 'Overall market trend - bull or bear market conditions',
    },
  ];

  return (
    <div className="factor-chips">
      <style>{`
        .factor-chips {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
        }
        
        .factor-chip {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: var(--font-weight-bold);
          cursor: help;
          transition: all 0.2s ease;
        }
        
        .factor-chip.pass {
          background-color: var(--color-success);
          color: white;
        }
        
        .factor-chip.fail {
          background-color: var(--color-error);
          color: white;
        }
        
        .factor-chip.limited {
          background-color: var(--color-text-muted);
          color: white;
        }
        
        .factor-chip:hover {
          transform: scale(1.1);
        }
      `}</style>
      
      {factors.map((factor) => (
        <span
          key={factor.key}
          className={`factor-chip ${
            result.flags.includes('data-limited') && ['C', 'A', 'I'].includes(factor.key)
              ? 'limited'
              : factor.pass
              ? 'pass'
              : 'fail'
          }`}
          title={`${factor.label}: ${factor.description}`}
        >
          {factor.key}
        </span>
      ))}
    </div>
  );
}