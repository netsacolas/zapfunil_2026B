/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Layout from './components/Layout';
import LoginView from './components/Auth/LoginView';
import { useAppStore } from './store/useAppStore';

export default function App() {
  const isAuthenticated = useAppStore(state => state.isAuthenticated);

  if (!isAuthenticated) {
    return <LoginView />;
  }

  return <Layout />;
}

