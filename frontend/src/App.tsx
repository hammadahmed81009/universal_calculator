import { Route, Router } from 'wouter';
import AppLayout from './components/AppLayout';
import UniversalCalculator from './pages/UniversalCalculator';
import SavedBids from './pages/SavedBids';
import OrderRequestNew from './pages/OrderRequestNew';

function App() {
  return (
    <Router>
      <Route path="/">
        <AppLayout>
          <UniversalCalculator />
        </AppLayout>
      </Route>
      <Route path="/saved-bids">
        <AppLayout>
          <SavedBids />
        </AppLayout>
      </Route>
      <Route path="/order-requests/new">
        <AppLayout>
          <OrderRequestNew />
        </AppLayout>
      </Route>
    </Router>
  );
}

export default App;
