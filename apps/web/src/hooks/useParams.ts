import { useEffect, useState } from 'react';

export function useParams() {
  const [params, setParams] = useState<Record<string, string>>({});

  useEffect(() => {
    const parse = () => {
      const hash = window.location.hash.replace('#', '');
      const path = hash.split('?')[0];
      const segments = path.split('/').filter(Boolean);
      const result: Record<string, string> = {};
      if (segments.length >= 2) {
        result.id = segments[1];
      }
      setParams(result);
    };

    parse();
    window.addEventListener('hashchange', parse);
    return () => window.removeEventListener('hashchange', parse);
  }, []);

  return params;
}
