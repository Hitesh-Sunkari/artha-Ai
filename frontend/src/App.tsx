import React, { useState } from 'react';
import { Header } from './components/Header';
import { Sidebar, type TabId } from './components/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { NewResearchPage } from './pages/NewResearchPage';
import { RunDetailsPage } from './pages/RunDetailsPage';
import { HistoryPage } from './pages/HistoryPage';
import { ArchitecturePage } from './pages/ArchitecturePage';
import { EvaluationPage } from './pages/EvaluationPage';
import { SystemStatusPage } from './pages/SystemStatusPage';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleNavigate = (tab: TabId, runId?: string) => {
    if (runId) {
      setActiveRunId(runId);
    }
    setActiveTab(tab);
  };

  const handleSubmitted = (newRunId: string) => {
    setActiveRunId(newRunId);
    setActiveTab('live-execution');
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setRefreshKey((k) => k + 1);
    setTimeout(() => setIsRefreshing(false), 800);
  };

  return (
    <div className="terminal-layout">
      {/* Persistent Institutional Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={(tab) => handleNavigate(tab)}
        activeRunId={activeRunId}
      />

      {/* Main Terminal Frame */}
      <div className="terminal-main">
        {/* Top Control-Plane Header */}
        <Header onRefresh={handleRefresh} isRefreshing={isRefreshing} />

        {/* Scrollable Workspace Content Area */}
        <main className="terminal-content" key={refreshKey}>
          {activeTab === 'dashboard' && <DashboardPage onNavigate={handleNavigate} />}

          {activeTab === 'new-research' && <NewResearchPage onSubmitted={handleSubmitted} />}

          {activeTab === 'live-execution' && (
            <RunDetailsPage
              runId={activeRunId}
              onBack={() => handleNavigate('dashboard')}
            />
          )}

          {activeTab === 'history' && (
            <HistoryPage
              onOpenRun={(id) => handleNavigate('live-execution', id)}
            />
          )}

          {activeTab === 'architecture' && <ArchitecturePage />}

          {activeTab === 'evaluation' && <EvaluationPage />}

          {activeTab === 'system-status' && <SystemStatusPage />}
        </main>
      </div>
    </div>
  );
};

export default App;
