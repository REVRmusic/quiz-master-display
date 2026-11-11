import { useState, useEffect } from 'react';
import { ControlView } from './components/ControlView';
import { DisplayView } from './components/DisplayView';
import { DmxStandaloneView } from './components/DmxStandaloneView';

export function App() {
  const [view, setView] = useState<'control' | 'display' | 'dmx'>('control');

  useEffect(() => {
    const checkView = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const viewParam = urlParams.get('view');
      const isDisplay =
        viewParam === 'display' ||
        window.location.hash === '#display' ||
        window.location.pathname.endsWith('/display');
      const isDmx =
        viewParam === 'dmx' ||
        window.location.hash === '#dmx' ||
        window.location.pathname.endsWith('/dmx');

      if (isDisplay) {
        setView('display');
      } else if (isDmx) {
        setView('dmx');
      } else {
        setView('control');
      }
    };

    checkView();
    window.addEventListener('popstate', checkView);
    window.addEventListener('hashchange', checkView);

    return () => {
      window.removeEventListener('popstate', checkView);
      window.removeEventListener('hashchange', checkView);
    };
  }, []);

  if (view === 'display') {
    return <DisplayView />;
  }

  if (view === 'dmx') {
    return <DmxStandaloneView />;
  }

  return <ControlView />;
}

export default App;
