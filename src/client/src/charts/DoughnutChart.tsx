import '../charts/chartjs';
import { Doughnut } from 'react-chartjs-2';
import { CHART_PALETTE, RADIUS } from '../theme/tokens';

type Props = {
  labels: string[];
  data: number[];
  colors?: readonly string[];
  height?: number;
  centerLabel?: string;
};

const DEFAULT_COLORS = CHART_PALETTE.categorical;

const formatPercent = (v: number, total: number) => {
  if (!total) return '0%';
  const p = (v / total) * 100;
  return Number.isInteger(p) ? `${p}%` : `${p.toFixed(1)}%`;
};

export const DoughnutChart = ({ labels, data, colors, height = 260, centerLabel }: Props) => {
  const palette = colors ?? DEFAULT_COLORS;
  const total = data.reduce((acc, v) => acc + (v ?? 0), 0);
  return (
    <div style={{ height, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'stretch' }}>
      <div style={{ flex: '1 1 200px', minWidth: 200, position: 'relative' }}>
        <Doughnut
          data={{
            labels,
            datasets: [
              {
                label: centerLabel ?? 'Distribution',
                data,
                backgroundColor: palette,
                borderWidth: 2,
                borderColor: CHART_PALETTE.surface,
              },
            ],
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            cutout: '62%',
            plugins: {
              legend: { display: false },
            },
          }}
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
                  background: palette[i % palette.length],
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
