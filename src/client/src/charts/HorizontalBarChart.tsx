import '../charts/chartjs';
import type { Chart, Plugin } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { CHART_PALETTE } from '../theme/tokens';

type Props = {
  labels: string[];
  data: number[];
  height?: number;
  color?: string;
  label?: string;
  max?: number;
  min?: number;
};

const valueAtEndPlugin: Plugin<'bar'> = {
  id: 'valueAtEnd',
  afterDatasetsDraw(chart: Chart<'bar'>) {
    const { ctx } = chart;
    const meta = chart.getDatasetMeta(0);
    const dataset = chart.data.datasets[0];
    if (!dataset) return;
    const values = dataset.data as Array<number | null | undefined>;
    ctx.save();
    ctx.font = '600 12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
    ctx.fillStyle = CHART_PALETTE.text;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    meta.data.forEach((bar, i) => {
      const v = values[i];
      if (v == null || Number.isNaN(v)) return;
      const text = Number.isInteger(v) ? String(v) : (v as number).toFixed(1);
      ctx.fillText(text, bar.x + 6, bar.y);
    });
    ctx.restore();
  },
};

export const HorizontalBarChart = ({
  labels,
  data,
  height = 320,
  color = CHART_PALETTE.primaryBar,
  label = 'Điểm trung bình',
  min = 1,
  max = 9,
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
              borderRadius: 6,
            },
          ],
        }}
        options={{
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          layout: { padding: { right: 24 } },
          plugins: { legend: { display: false } },
          scales: {
            x: { min, max, ticks: { stepSize: 1 } },
            y: { ticks: { font: { size: 11 } } },
          },
        }}
        plugins={[valueAtEndPlugin]}
      />
    </div>
  );
};
