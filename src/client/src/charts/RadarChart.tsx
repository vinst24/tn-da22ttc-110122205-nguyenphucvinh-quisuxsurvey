import '../charts/chartjs';
import { Radar } from 'react-chartjs-2';
import { CHART_PALETTE } from '../theme/tokens';

export const RadarChart = ({ labels, data, height = 300 }: { labels: string[]; data: number[]; height?: number }) => {
  return (
    <div style={{ height }}>
      <Radar
        data={{
          labels,
          datasets: [
            {
              label: 'Điểm trung bình',
              data,
              backgroundColor: CHART_PALETTE.primarySubtle,
              borderColor: CHART_PALETTE.primary,
              pointBackgroundColor: CHART_PALETTE.primary,
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            r: { min: 1, max: 9, ticks: { stepSize: 1 } },
          },
        }}
      />
    </div>
  );
};
