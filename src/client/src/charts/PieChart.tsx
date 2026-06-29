import '../charts/chartjs';
import { Pie } from 'react-chartjs-2';
import { CHART_PALETTE, RADIUS } from '../theme/tokens';

const COLORS = CHART_PALETTE.distribution;

const formatPercent = (v: number, total: number) => {
  if (!total) return '0%';
  const p = (v / total) * 100;
  return Number.isInteger(p) ? `${p}%` : `${p.toFixed(1)}%`;
};

export const PieChart = ({ labels, data, height = 260 }: { labels: string[]; data: number[]; height?: number }) => {
  const total = data.reduce((acc, v) => acc + (v ?? 0), 0);
  return (
    <div style={{ height, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'stretch' }}>
      <div style={{ flex: '1 1 200px', minWidth: 200, position: 'relative' }}>
        <Pie
          data={{
            labels,
            datasets: [
              {
                label: 'Responses',
                data,
                backgroundColor: COLORS,
              },
            ],
          }}
          options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }}
        />
      </div>
      <ul
        style={{
          width: 180,
          margin: 0,
          padding: '8px 10px',
          listStyle: 'none',
          fontSize: 12,
          color: CHART_PALETTE.panelText,
          background: CHART_PALETTE.panelBackground,
          border: `1px solid ${CHART_PALETTE.panelBorder}`,
          borderRadius: RADIUS.md,
          overflowY: 'auto',
          maxHeight: '100%',
        }}
      >
        {labels.map((label, i) => {
          const v = data[i] ?? 0;
          if (!v) return null;
          return (
            <li key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0' }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  background: COLORS[i % COLORS.length],
                  flexShrink: 0,
                }}
              />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
              <span style={{ color: CHART_PALETTE.textMuted }}>{v}</span>
              <span style={{ fontWeight: 700, color: CHART_PALETTE.text }}>{formatPercent(v, total)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
