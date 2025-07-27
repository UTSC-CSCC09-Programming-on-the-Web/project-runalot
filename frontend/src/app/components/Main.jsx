'use client';

import { useNavigation } from '../contexts/NavigationContext';
import HomePage from '../HomePage';
import Dashboard from '../dashboard/page';
import WaitingRoom from './WaitingRoom';
import CreditsPage from '../credits/page';

export default function Main() {
  const { view } = useNavigation();

  switch (view) {
    case 'home':
      return <HomePage />;
    case 'dashboard':
      return <Dashboard />;
    case 'play':
      return <WaitingRoom />;
    case 'credits':
        return <CreditsPage/>
    default:
      return <HomePage />;
  }
}
