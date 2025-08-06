import { AuthProvider } from './contexts/AuthContext';
import { AppProvider } from './contexts/AppContext';
import AppRouter from './router/AppRouter';
import Notification from './components/ui/Notification';
import './styles/globals.css';

function App(): JSX.Element {
  return (
    <AuthProvider>
      <AppProvider>
        <AppRouter />
        <Notification />
      </AppProvider>
    </AuthProvider>
  );
}

export default App;