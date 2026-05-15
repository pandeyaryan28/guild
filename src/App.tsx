/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { Layout } from "./components/Layout";
import { DashboardHome } from "./components/DashboardHome";

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  return (
    <div className={theme}>
      <Layout toggleTheme={toggleTheme} currentTheme={theme}>
        <DashboardHome />
      </Layout>
    </div>
  );
}
