import React, { useState } from 'react';
import { Header } from './components/Header';
import { Sidebar, type PrimaryWorkspace, type TabId } from './components/Sidebar';
import { CommandCenterPage } from './pages/CommandCenterPage';
import { ResearchWorkspacePage } from './pages/ResearchWorkspacePage';
import { PortfolioTradingPage } from './pages/PortfolioTradingPage';
import { OperationsPage } from './pages/OperationsPage';
import { CopilotDrawer } from './components/CopilotDrawer';

export const App: React.FC = () => {
  const [activeWorkspace, setActiveWorkspace] = useState<PrimaryWorkspace>('command-center');
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [portfolioHandoff, setPortfolioHandoff] = useState<{
    ticker?: string;
    side?: 'BUY' | 'SELL';
  } | null>(null);
  const [operationsSubTab, setOperationsSubTab] = useState<
    'overview' | 'telemetry' | 'topology' | 'audit' | 'diagnostics' | 'evaluation'
  >('overview');
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Consolidated navigation normalizer
  const handleNavigate = (tab: TabId, runId?: string) => {
    if (runId) {
      setActiveRunId(runId);
    }

    if (tab === 'command-center' || tab === 'dashboard') {
      setActiveWorkspace('command-center');
    } else if (
      tab === 'research' ||
      tab === 'new-research' ||
      tab === 'live-execution' ||
      tab === 'committee' ||
      tab === 'evidence'
    ) {
      setActiveWorkspace('research');
    } else if (tab === 'portfolio') {
      setActiveWorkspace('portfolio');
    } else {
      // Operations mapping
      setActiveWorkspace('operations');
      if (tab === 'telemetry') setOperationsSubTab('telemetry');
      else if (tab === 'history') setOperationsSubTab('audit');
      else if (tab === 'architecture') setOperationsSubTab('topology');
      else if (tab === 'system-status') setOperationsSubTab('diagnostics');
      else if (tab === 'evaluation') setOperationsSubTab('evaluation');
      else setOperationsSubTab('overview');
    }
  };

  // Safe research -> paper trading handoff
  const handleTradeHandoff = (ticker?: string, side?: 'BUY' | 'SELL') => {
    setPortfolioHandoff({ ticker, side });
    setActiveWorkspace('portfolio');
  };

  // Open any historical or audit run directly in the Research Workspace
  const handleOpenRunInResearch = (runId: string) => {
    setActiveRunId(runId);
    setActiveWorkspace('research');
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setRefreshKey((k) => k + 1);
    setTimeout(() => setIsRefreshing(false), 800);
  };

  return (
    <div className="terminal-layout">
      {/* Exactly 4 Primary Institutional Navigation Destinations */}
      <Sidebar
        activeTab={activeWorkspace}
        onSelectTab={(tab) => handleNavigate(tab)}
        activeRunId={activeRunId}
      />

      {/* Main Terminal Frame */}
      <div className="terminal-main">
        {/* Top Control-Plane Header */}
        <Header
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          activeWorkspace={activeWorkspace}
          onSelectWorkspace={(ws) => handleNavigate(ws)}
        />

        {/* Scrollable Primary Workspace Area */}
        <main className="terminal-content" key={refreshKey}>
          {activeWorkspace === 'command-center' && (
            <CommandCenterPage onNavigate={handleNavigate} />
          )}

          {activeWorkspace === 'research' && (
            <ResearchWorkspacePage
              initialRunId={activeRunId}
              onNavigateToPortfolio={handleTradeHandoff}
            />
          )}

          {activeWorkspace === 'portfolio' && (
            <PortfolioTradingPage
              initialSymbol={portfolioHandoff?.ticker}
              initialSide={portfolioHandoff?.side}
            />
          )}

          {activeWorkspace === 'operations' && (
            <OperationsPage
              onOpenRunInResearch={handleOpenRunInResearch}
              initialTab={operationsSubTab}
            />
          )}
        </main>
      </div>

      {/* Persistent Institutional AI Copilot Drawer */}
      <CopilotDrawer activeContext={activeRunId || activeWorkspace} />
    </div>
  );
};

export default App;
