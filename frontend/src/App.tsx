import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar, type PrimaryWorkspace, type TabId } from './components/Sidebar';
import { CommandCenterPage } from './pages/CommandCenterPage';
import { ResearchWorkspacePage } from './pages/ResearchWorkspacePage';
import { PortfolioTradingPage } from './pages/PortfolioTradingPage';
import { ProfilePage } from './pages/ProfilePage';
import { AuthPage } from './pages/AuthPage';
import { CopilotDrawer } from './components/CopilotDrawer';
import { initTelemetryReporter, isUserSuperAdmin } from './utils/telemetryReporter';

export const App: React.FC = () => {
  const [activeWorkspace, setActiveWorkspace] = useState<PrimaryWorkspace>('command-center');
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [researchSymbol, setResearchSymbol] = useState<string | null>(null);
  const [portfolioHandoff, setPortfolioHandoff] = useState<{
    ticker?: string;
    side?: 'BUY' | 'SELL';
  } | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    // Initialize continuous client telemetry, error capture, and portfolio sync
    initTelemetryReporter(() => activeWorkspace);
  }, [activeWorkspace]);

  // Consolidated navigation normalizer
  const handleNavigate = (tab: TabId, targetId?: string) => {
    if (targetId) {
      if (targetId.includes('.NS') || targetId.length <= 12) {
        setResearchSymbol(targetId);
      } else {
        setActiveRunId(targetId);
      }
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
    } else if (tab === 'profile') {
      setActiveWorkspace('profile');
    } else if (tab === 'auth') {
      setActiveWorkspace('auth');
    } else {
      // Direct link to standalone Admin Portal website
      window.open('http://127.0.0.1:5174', '_blank');
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
          onSelectWorkspace={(ws, targetId) => handleNavigate(ws, targetId)}
        />

        {/* Scrollable Primary Workspace Area */}
        <main className="terminal-content" key={refreshKey}>
          {activeWorkspace === 'command-center' && (
            <CommandCenterPage onNavigate={handleNavigate} />
          )}

          {activeWorkspace === 'research' && (
            <ResearchWorkspacePage
              initialRunId={activeRunId}
              initialSymbol={researchSymbol}
              onNavigateToPortfolio={handleTradeHandoff}
            />
          )}

          {activeWorkspace === 'portfolio' && (
            <PortfolioTradingPage
              initialSymbol={portfolioHandoff?.ticker}
              initialSide={portfolioHandoff?.side}
            />
          )}

          {activeWorkspace === 'profile' && (
            <ProfilePage onNavigate={handleNavigate} />
          )}

          {activeWorkspace === 'auth' && (
            <AuthPage
              onAuthSuccess={() => setActiveWorkspace('command-center')}
              onBack={() => setActiveWorkspace('command-center')}
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
