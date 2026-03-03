import { Route, Router } from 'wouter';
import AppLayout from './components/AppLayout';
import UniversalCalculator from './pages/UniversalCalculator';

function App() {
  return (
    <Router>
      <Route path="/">
        <AppLayout>
          <UniversalCalculator />
        </AppLayout>
      </Route>
    </Router>
  );
}

export default App;
