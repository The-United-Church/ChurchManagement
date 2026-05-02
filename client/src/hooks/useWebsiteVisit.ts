import { useEffect } from 'react';
import { recordWebsiteVisit } from '@/lib/api';

const VISITOR_KEY = 'church_mgmt_visitor_id';
const recordedThisRuntime = new Set<string>();

function getVisitorId(): string {
  const existing = localStorage.getItem(VISITOR_KEY);
  if (existing) return existing;
  const next = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  localStorage.setItem(VISITOR_KEY, next);
  return next;
}

export function useWebsiteVisit(pageType: 'main_landing' | 'custom_domain_landing') {
  useEffect(() => {
    const key = `visit:${pageType}:${window.location.hostname}:${window.location.pathname}`;
    if (recordedThisRuntime.has(key)) return;
    recordedThisRuntime.add(key);

    void recordWebsiteVisit({
      domain: window.location.hostname,
      path: window.location.pathname,
      pageType,
      visitorId: getVisitorId(),
    }).catch((error) => {
      recordedThisRuntime.delete(key);
      if (import.meta.env.DEV) {
        console.warn('Website visit was not recorded:', error);
      }
    });
  }, [pageType]);
}
