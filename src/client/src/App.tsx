import { BrowserRouter } from 'react-router-dom';
import { AppProviders } from './layouts/AppProviders';
import { AppRouter } from './routes/AppRouter';

function App() {
  return (
    <AppProviders>
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
    </AppProviders>
  );
}

export default App;
