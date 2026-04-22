import { useSearchParams } from 'react-router-dom';

/**
 * useTabState(defaultTab, paramName = 'tab')
 *
 * Drop-in replacement for `useState(defaultTab)` when you want the active tab
 * to be persisted in the URL (?tab=xxx) so that:
 *   - Refresh keeps the user on the same tab
 *   - Deep links share the exact view
 *   - Browser back/forward navigates between tabs
 *
 * Usage:
 *   const [activeTab, setActiveTab] = useTabState('overview');
 */
const useTabState = (defaultTab, paramName = 'tab') => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get(paramName) || defaultTab;

  const setActiveTab = (tab) => {
    const next = new URLSearchParams(searchParams);
    if (!tab || tab === defaultTab) {
      next.delete(paramName);
    } else {
      next.set(paramName, tab);
    }
    setSearchParams(next, { replace: true });
  };

  return [activeTab, setActiveTab];
};

export default useTabState;
