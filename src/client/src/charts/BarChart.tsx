import '../charts/chartjs';
import type { Chart, Plugin } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { CHART_PALETTE } from '../theme/tokens';

type Props = {
  labels: string[];
  data: number[];
  height?: number;
  label?: string;
  color?: string;
  min?: number;
  max?: number;
  stepSize?: number;
};

const valueOnTopPlugin: Plugin<'bar'> = {
  id: 'valueOnTop',
  afterDatasetsDraw(chart: Chart<'bar'>) {
    const { ctx } = chart;
    const meta = chart.getDatasetMeta(0);
    const dataset = chart.data.datasets[0];
    if (!dataset) return;
    const values = dataset.data as Array<number | null | undefined>;
    ctx.save();
    ctx.font = '600 12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
    ctx.fillStyle = CHART_PALETTE.text;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    meta.data.forEach((bar, i) => {
      const v = values[i];
      if (v == null || Number.isNaN(v)) return;
      const text = Number.isInteger(v) ? String(v) : (v as number).toFixed(1);
      ctx.fillText(text, bar.x, bar.y - 4);
    });
    ctx.restore();
  },
};

export const BarChart = ({
  labels,
  data,
  height = 320,
  label = 'Điểm trung bình',
  color = CHART_PALETTE.secondaryBar,
  min = 1,
  max = 9,
  stepSize = 1,
}: Props) => {
  return (
    <div style={{ height }}>
      <Bar
        data={{
          labels,
          datasets: [
            {
              label,
              data,
              backgroundColor: color,
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          layout: { padding: { top: 16 } },
          scales: { y: { min, max, ticks: { stepSize } } },
        }}
        plugins={[valueOnTopPlugin]}
      />
    </div>
  );
};