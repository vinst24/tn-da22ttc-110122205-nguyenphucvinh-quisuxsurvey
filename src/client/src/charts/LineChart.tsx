import '../charts/chartjs';
import { Line } from 'react-chartjs-2';
import { CHART_PALETTE } from '../theme/tokens';

type Props = {
  labels: string[];
  data: number[];
  height?: number;
  label?: string;
  min?: number;
  max?: number;
};

export const LineChart = ({ labels, data, height = 280, label = 'Điểm trung bình', min = 1, max = 9 }: Props) => {
  return (
    <div style={{ height }}>
      <Line
        data={{
          labels,
          datasets: [
            {
              label,
              data,
              borderColor: CHART_PALETTE.primary,
              backgroundColor: CHART_PALETTE.primarySoft,
              tension: 0.35,
              fill: true,
              pointRadius: 3,
              pointHoverRadius: 6,
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { min, max, ticks: { stepSize: 1 } },
            x: { ticks: { font: { size: 11 } } },
          },
        }}
      />
    </div>
  );
};
