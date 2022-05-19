import { createRoot } from 'react-dom/client';
import { CatchError, ThemeProvider } from 'design';
import App from './App';

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(
  <CatchError>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </CatchError>,
);
